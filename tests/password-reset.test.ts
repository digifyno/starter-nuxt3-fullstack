// @vitest-environment node
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { setup, $fetch, fetch } from '@nuxt/test-utils/e2e'
import { PrismaClient } from '@prisma/client'
import { resolve } from 'path'
import argon2 from 'argon2'

const TEST_DB_PATH = resolve(process.cwd(), 'tests', 'test.db')
const TEST_DB_URL = `file:${TEST_DB_PATH}`

const prisma = new PrismaClient({ datasourceUrl: TEST_DB_URL })

describe('Password Reset & Change API', async () => {
  await setup({
    build: false,
    server: true,
    nuxtConfig: {
      nitro: { output: { dir: resolve(process.cwd(), 'dist') } },
    },
    env: {
      DATABASE_URL: TEST_DB_URL,
      NUXT_JWT_SECRET: 'test-jwt-secret-for-testing-minimum-32chars',
      RATE_LIMIT_DISABLED: '1',
    },
  })

  // CSRF credentials — nuxt-security uses nuxt-csurf double-submit cookie pattern
  let csrfToken = ''
  let csrfCookie = ''
  beforeAll(async () => {
    const res = await fetch('/')
    const html = await res.text()
    csrfToken = html.match(/<meta name="csrf-token" content="([^"]+)"/)?.[1] ?? ''
    const setCookie = res.headers.get('set-cookie') ?? ''
    const cookieMatch = setCookie.match(/(?:^|,\s*)(?:__Host-)?csrf=([^;,]+)/)
    const cookieName = setCookie.includes('__Host-csrf') ? '__Host-csrf' : 'csrf'
    csrfCookie = `${cookieName}=${cookieMatch?.[1] ?? ''}`
  })

  beforeEach(async () => {
    await prisma.tokenBlocklist.deleteMany()
    await prisma.task.deleteMany()
    await prisma.passwordResetToken.deleteMany()
    await prisma.user.deleteMany()
    await prisma.loginAttempt.deleteMany()
  })

  async function register(email: string, password = 'Password123', name = 'Test User') {
    return $fetch<{ user: { id: number; email: string; name: string } }>('/api/auth/register', {
      method: 'POST',
      headers: { 'csrf-token': csrfToken, Cookie: csrfCookie },
      body: { email, password, name },
    })
  }

  async function loginGetCookie(email: string, password = 'Password123'): Promise<string> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'csrf-token': csrfToken, Cookie: csrfCookie },
      body: JSON.stringify({ email, password }),
    })
    const setCookie = res.headers.get('set-cookie') ?? ''
    const match = setCookie.match(/auth_token=([^;]+)/)
    return match?.[1] ?? ''
  }

  // Helper: create a password reset token directly in DB and return the plaintext token
  async function createResetToken(userId: number): Promise<string> {
    const { randomBytes } = await import('crypto')
    const plainToken = randomBytes(32).toString('hex')
    const hashedToken = await argon2.hash(plainToken, { type: argon2.argon2id })
    await prisma.passwordResetToken.create({
      data: {
        userId,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    })
    return plainToken
  }

  describe('POST /api/auth/forgot-password', () => {
    it('returns 200 for existing email', async () => {
      await register('forgot@test.com')
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'csrf-token': csrfToken, Cookie: csrfCookie },
        body: JSON.stringify({ email: 'forgot@test.com' }),
      })
      expect(res.status).toBe(200)
    })

    it('returns 200 for non-existent email (no enumeration)', async () => {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'csrf-token': csrfToken, Cookie: csrfCookie },
        body: JSON.stringify({ email: 'nobody@test.com' }),
      })
      expect(res.status).toBe(200)
    })

    it('creates a token record in the database', async () => {
      const result = await register('tokentest@test.com')
      const userId = result.user.id

      await $fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'csrf-token': csrfToken, Cookie: csrfCookie },
        body: { email: 'tokentest@test.com' },
      })

      const tokens = await prisma.passwordResetToken.findMany({ where: { userId } })
      expect(tokens).toHaveLength(1)
      expect(tokens[0].usedAt).toBeNull()
    })

    it('returns 400 for invalid email format', async () => {
      const err: any = await $fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'csrf-token': csrfToken, Cookie: csrfCookie },
        body: { email: 'not-an-email' },
      }).catch((e) => e)
      expect(err.response?.status).toBe(400)
    })
  })

  describe('POST /api/auth/reset-password', () => {
    it('resets password with valid token', async () => {
      const result = await register('reset@test.com')
      const plainToken = await createResetToken(result.user.id)

      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'csrf-token': csrfToken, Cookie: csrfCookie },
        body: JSON.stringify({ token: plainToken, newPassword: 'NewPass123' }),
      })
      expect(res.status).toBe(200)

      // Verify new password works
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'csrf-token': csrfToken, Cookie: csrfCookie },
        body: JSON.stringify({ email: 'reset@test.com', password: 'NewPass123' }),
      })
      expect(loginRes.status).toBe(200)
    })

    it('marks token as used after successful reset', async () => {
      const result = await register('markused@test.com')
      const plainToken = await createResetToken(result.user.id)

      await $fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'csrf-token': csrfToken, Cookie: csrfCookie },
        body: { token: plainToken, newPassword: 'NewPass123' },
      })

      const token = await prisma.passwordResetToken.findFirst({ where: { userId: result.user.id } })
      expect(token?.usedAt).not.toBeNull()
    })

    it('rejects used tokens', async () => {
      const result = await register('usedtoken@test.com')
      const plainToken = await createResetToken(result.user.id)

      // Use the token once
      await $fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'csrf-token': csrfToken, Cookie: csrfCookie },
        body: { token: plainToken, newPassword: 'NewPass123' },
      })

      // Try to use it again
      const err: any = await $fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'csrf-token': csrfToken, Cookie: csrfCookie },
        body: { token: plainToken, newPassword: 'AnotherPass456' },
      }).catch((e) => e)
      expect(err.response?.status).toBe(400)
    })

    it('rejects expired tokens', async () => {
      const result = await register('expired@test.com')
      const { randomBytes } = await import('crypto')
      const plainToken = randomBytes(32).toString('hex')
      const hashedToken = await argon2.hash(plainToken, { type: argon2.argon2id })

      // Create an already-expired token
      await prisma.passwordResetToken.create({
        data: {
          userId: result.user.id,
          token: hashedToken,
          expiresAt: new Date(Date.now() - 1000), // 1 second in the past
        },
      })

      const err: any = await $fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'csrf-token': csrfToken, Cookie: csrfCookie },
        body: { token: plainToken, newPassword: 'NewPass123' },
      }).catch((e) => e)
      expect(err.response?.status).toBe(400)
    })

    it('rejects invalid token', async () => {
      const err: any = await $fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'csrf-token': csrfToken, Cookie: csrfCookie },
        body: { token: 'invalidtoken', newPassword: 'NewPass123' },
      }).catch((e) => e)
      expect(err.response?.status).toBe(400)
    })

    it('rejects weak new password', async () => {
      const result = await register('weakpw@test.com')
      const plainToken = await createResetToken(result.user.id)

      const err: any = await $fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'csrf-token': csrfToken, Cookie: csrfCookie },
        body: { token: plainToken, newPassword: 'weak' },
      }).catch((e) => e)
      expect(err.response?.status).toBe(400)
    })

    it('invalidates existing JWTs after reset', async () => {
      const result = await register('invalidatejwt@test.com')
      const cookie = await loginGetCookie('invalidatejwt@test.com')

      // Verify token works before reset
      const before = await $fetch<{ user: { email: string } }>('/api/auth/me', {
        headers: { 'csrf-token': csrfToken, cookie: `auth_token=${cookie}; ${csrfCookie}` },
      })
      expect(before.user.email).toBe('invalidatejwt@test.com')

      // Reset the password
      const plainToken = await createResetToken(result.user.id)
      await $fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'csrf-token': csrfToken, Cookie: csrfCookie },
        body: { token: plainToken, newPassword: 'NewPass456' },
      })

      // Old token should now be rejected
      const err: any = await $fetch('/api/auth/me', {
        headers: { 'csrf-token': csrfToken, cookie: `auth_token=${cookie}; ${csrfCookie}` },
      }).catch((e) => e)
      expect(err.response?.status).toBe(401)
    })
  })

  describe('POST /api/auth/change-password', () => {
    it('changes password with correct current password', async () => {
      await register('changepw@test.com')
      const cookie = await loginGetCookie('changepw@test.com')

      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'csrf-token': csrfToken,
          cookie: `auth_token=${cookie}; ${csrfCookie}`,
        },
        body: JSON.stringify({ currentPassword: 'Password123', newPassword: 'NewPass456' }),
      })
      expect(res.status).toBe(200)

      // Verify new password works for login
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'csrf-token': csrfToken, Cookie: csrfCookie },
        body: JSON.stringify({ email: 'changepw@test.com', password: 'NewPass456' }),
      })
      expect(loginRes.status).toBe(200)
    })

    it('rejects wrong current password', async () => {
      await register('wrongcurrent@test.com')
      const cookie = await loginGetCookie('wrongcurrent@test.com')

      const err: any = await $fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'csrf-token': csrfToken, cookie: `auth_token=${cookie}; ${csrfCookie}` },
        body: { currentPassword: 'WrongPass123', newPassword: 'NewPass456' },
      }).catch((e) => e)
      expect(err.response?.status).toBe(400)
    })

    it('returns 401 when unauthenticated', async () => {
      const err: any = await $fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'csrf-token': csrfToken, Cookie: csrfCookie },
        body: { currentPassword: 'Password123', newPassword: 'NewPass456' },
      }).catch((e) => e)
      expect(err.response?.status).toBe(401)
    })

    it('rejects weak new password', async () => {
      await register('weakchange@test.com')
      const cookie = await loginGetCookie('weakchange@test.com')

      const err: any = await $fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'csrf-token': csrfToken, cookie: `auth_token=${cookie}; ${csrfCookie}` },
        body: { currentPassword: 'Password123', newPassword: 'weak' },
      }).catch((e) => e)
      expect(err.response?.status).toBe(400)
    })

    it('invalidates existing sessions after password change', async () => {
      await register('invalidsession@test.com')
      const cookie = await loginGetCookie('invalidsession@test.com')

      // Verify token works before change
      const before = await $fetch<{ user: { email: string } }>('/api/auth/me', {
        headers: { 'csrf-token': csrfToken, cookie: `auth_token=${cookie}; ${csrfCookie}` },
      })
      expect(before.user.email).toBe('invalidsession@test.com')

      // Change password
      await $fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'csrf-token': csrfToken, cookie: `auth_token=${cookie}; ${csrfCookie}` },
        body: { currentPassword: 'Password123', newPassword: 'NewPass456' },
      })

      // Old token should now be rejected
      const err: any = await $fetch('/api/auth/me', {
        headers: { 'csrf-token': csrfToken, cookie: `auth_token=${cookie}; ${csrfCookie}` },
      }).catch((e) => e)
      expect(err.response?.status).toBe(401)
    })
  })
})
