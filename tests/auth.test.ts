// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { setup, $fetch, fetch } from '@nuxt/test-utils/e2e'
import { PrismaClient } from '@prisma/client'
import { resolve } from 'path'

const TEST_DB_PATH = resolve(process.cwd(), 'tests', 'test.db')
const TEST_DB_URL = `file:${TEST_DB_PATH}`

const prisma = new PrismaClient({ datasourceUrl: TEST_DB_URL })

describe('Auth API', async () => {
  await setup({
    server: true,
    env: {
      DATABASE_URL: TEST_DB_URL,
      JWT_SECRET: 'test-jwt-secret-for-testing-minimum-32chars',
      RATE_LIMIT_DISABLED: '1',
    },
  })

  beforeEach(async () => {
    await prisma.tokenBlocklist.deleteMany()
    await prisma.task.deleteMany()
    await prisma.user.deleteMany()
    await prisma.loginAttempt.deleteMany()
  })

  async function register(email: string, password = 'Password123', name = 'Test User') {
    return $fetch<{ user: { id: number; email: string; name: string } }>('/api/auth/register', {
      method: 'POST',
      body: { email, password, name },
    })
  }

  async function loginGetCookie(email: string, password = 'Password123'): Promise<string> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const setCookie = res.headers.get('set-cookie') ?? ''
    const match = setCookie.match(/auth_token=([^;]+)/)
    return match?.[1] ?? ''
  }

  describe('POST /api/auth/register', () => {
    it('creates user and returns id/email', async () => {
      const result = await register('new@test.com')
      expect(result.user.id).toBeDefined()
      expect(result.user.email).toBe('new@test.com')
    })

    it('returns 409 for duplicate email', async () => {
      await register('dup@test.com')
      const err = await $fetch('/api/auth/register', {
        method: 'POST',
        body: { email: 'dup@test.com', password: 'Password123', name: 'Dup' },
      }).catch((e) => e)
      expect(err.response?.status).toBe(409)
    })

    it('returns 400 with validation message for short password', async () => {
      const err = await $fetch('/api/auth/register', {
        method: 'POST',
        body: { email: 'short@test.com', password: '12', name: 'Test' },
      }).catch((e) => e)
      expect(err.response?.status).toBe(400)
    })
  })

  describe('POST /api/auth/login', () => {
    it('success sets auth_token httpOnly cookie', async () => {
      await register('login@test.com')
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'login@test.com', password: 'Password123' }),
      })
      expect(res.status).toBe(200)
      const setCookie = res.headers.get('set-cookie') ?? ''
      expect(setCookie).toContain('auth_token=')
      expect(setCookie.toLowerCase()).toContain('httponly')
    })

    it('returns 401 for wrong password', async () => {
      await register('wrongpw@test.com')
      const err = await $fetch('/api/auth/login', {
        method: 'POST',
        body: { email: 'wrongpw@test.com', password: 'wrongpass' },
      }).catch((e) => e)
      expect(err.response?.status).toBe(401)
    })

    it('returns 401 for unknown email (no enumeration)', async () => {
      const err = await $fetch('/api/auth/login', {
        method: 'POST',
        body: { email: 'unknown@test.com', password: 'Password123' },
      }).catch((e) => e)
      expect(err.response?.status).toBe(401)
    })

    describe('account lockout', () => {
      it('locks account after 5 failed attempts and returns 429 with Retry-After', async () => {
        await register('lockout@test.com')

        // 5 failed attempts
        for (let i = 0; i < 5; i++) {
          await $fetch('/api/auth/login', {
            method: 'POST',
            body: { email: 'lockout@test.com', password: 'wrongpass' },
          }).catch(() => {})
        }

        // 6th attempt should return 429
        const err = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'lockout@test.com', password: 'wrongpass' }),
        })
        expect(err.status).toBe(429)
        expect(err.headers.get('retry-after')).toBeTruthy()
      })

      it('successful login resets failed attempt counter', async () => {
        await register('reset@test.com')

        // 4 failed attempts (just below lockout threshold)
        for (let i = 0; i < 4; i++) {
          await $fetch('/api/auth/login', {
            method: 'POST',
            body: { email: 'reset@test.com', password: 'wrongpass' },
          }).catch(() => {})
        }

        // Successful login resets counter
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'reset@test.com', password: 'Password123' }),
        })
        expect(res.status).toBe(200)

        // Counter is reset: 4 more failed attempts should NOT trigger lockout
        for (let i = 0; i < 4; i++) {
          await $fetch('/api/auth/login', {
            method: 'POST',
            body: { email: 'reset@test.com', password: 'wrongpass' },
          }).catch(() => {})
        }

        // 5th attempt after reset: still below threshold (only 4 new failures), should get 401
        const afterReset = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'reset@test.com', password: 'wrongpass' }),
        })
        expect(afterReset.status).toBe(401)
      })

      it('allows login after lockout period expires', async () => {
        await register('expired@test.com')

        // Directly set an expired lockout in the DB
        await prisma.loginAttempt.upsert({
          where: { email: 'expired@test.com' },
          create: {
            email: 'expired@test.com',
            failedCount: 5,
            lockedUntil: new Date(Date.now() - 1000), // 1 second in the past
            lastAttemptAt: new Date(),
          },
          update: {
            failedCount: 5,
            lockedUntil: new Date(Date.now() - 1000),
          },
        })

        // Login should succeed (lockout has expired)
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'expired@test.com', password: 'Password123' }),
        })
        expect(res.status).toBe(200)
      })
    })
  })

  describe('GET /api/auth/me', () => {
    it('returns user when authenticated', async () => {
      await register('me@test.com')
      const cookie = await loginGetCookie('me@test.com')
      const result = await $fetch<{ user: { email: string } }>('/api/auth/me', {
        headers: { cookie: `auth_token=${cookie}` },
      })
      expect(result.user.email).toBe('me@test.com')
    })

    it('returns 401 when no cookie', async () => {
      const err = await $fetch('/api/auth/me').catch((e) => e)
      expect(err.response?.status).toBe(401)
    })
  })

  describe('POST /api/auth/logout', () => {
    it('clears the auth cookie', async () => {
      await register('logout@test.com')
      const cookie = await loginGetCookie('logout@test.com')
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { cookie: `auth_token=${cookie}` },
      })
      expect(res.status).toBe(200)
      const setCookie = res.headers.get('set-cookie') ?? ''
      // Cookie should be cleared: empty value or Max-Age=0
      expect(setCookie).toMatch(/auth_token=($|;|,)/)
    })

    it('rejects protected requests after logout using the old token', async () => {
      await register('revoke@test.com')
      const cookie = await loginGetCookie('revoke@test.com')

      // Verify token works before logout
      const before = await $fetch<{ user: { email: string } }>('/api/auth/me', {
        headers: { cookie: `auth_token=${cookie}` },
      })
      expect(before.user.email).toBe('revoke@test.com')

      // Logout (server adds token to blocklist)
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { cookie: `auth_token=${cookie}` },
      })

      // Old token should now be rejected
      const err = await $fetch('/api/auth/me', {
        headers: { cookie: `auth_token=${cookie}` },
      }).catch((e) => e)
      expect(err.response?.status).toBe(401)
    })

    it('logout succeeds when cookie is missing', async () => {
      const res = await fetch('/api/auth/logout', { method: 'POST' })
      expect(res.status).toBe(200)
    })
  })
})
