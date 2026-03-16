// @vitest-environment node
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { setup, $fetch, fetch } from '@nuxt/test-utils/e2e'
import { PrismaClient } from '@prisma/client'
import { resolve } from 'path'
import jwt from 'jsonwebtoken'

const TEST_DB_PATH = resolve(process.cwd(), 'tests', 'test.db')
const TEST_DB_URL = `file:${TEST_DB_PATH}`
const JWT_SECRET = 'test-jwt-secret-for-testing-minimum-32chars'

const prisma = new PrismaClient({ datasourceUrl: TEST_DB_URL })

describe('JWT Security', async () => {
  await setup({
    build: false,
    server: true,
    nuxtConfig: {
      nitro: { output: { dir: resolve(process.cwd(), 'dist') } },
    },
    env: {
      DATABASE_URL: TEST_DB_URL,
      NUXT_JWT_SECRET: JWT_SECRET,
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
    await prisma.user.deleteMany()
    await prisma.loginAttempt.deleteMany()
  })

  async function register(email: string) {
    return $fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'csrf-token': csrfToken, Cookie: csrfCookie },
      body: { email, password: 'Password123', name: 'Test User' },
    })
  }

  async function loginGetCookie(email: string): Promise<string> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'csrf-token': csrfToken, Cookie: csrfCookie },
      body: JSON.stringify({ email, password: 'Password123' }),
    })
    const setCookie = res.headers.get('set-cookie') ?? ''
    const match = setCookie.match(/auth_token=([^;]+)/)
    return match?.[1] ?? ''
  }

  it('rejects token with tampered payload', async () => {
    await register('tamper@test.com')
    const token = await loginGetCookie('tamper@test.com')

    // Split the JWT and modify the payload while keeping the original signature
    const parts = token.split('.')
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    payload.userId = 99999
    const tamperedPart = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const tamperedToken = `${parts[0]}.${tamperedPart}.${parts[2]}`

    const err = await $fetch('/api/auth/me', {
      headers: { cookie: `auth_token=${tamperedToken}` },
    }).catch((e) => e)
    expect(err.response?.status).toBe(401)
  })

  it('rejects token signed with wrong secret', async () => {
    const fakeToken = jwt.sign(
      { userId: 1, email: 'fake@test.com', jti: 'fake-jti' },
      'wrong-secret',
      { expiresIn: '1h' },
    )

    const err = await $fetch('/api/auth/me', {
      headers: { cookie: `auth_token=${fakeToken}` },
    }).catch((e) => e)
    expect(err.response?.status).toBe(401)
  })

  it('rejects expired token', async () => {
    await register('expired@test.com')
    const expiredToken = jwt.sign(
      {
        userId: 1,
        email: 'expired@test.com',
        jti: crypto.randomUUID(),
        exp: Math.floor(Date.now() / 1000) - 1,
      },
      JWT_SECRET,
    )

    const err = await $fetch('/api/tasks', {
      headers: { cookie: `auth_token=${expiredToken}` },
    }).catch((e) => e)
    expect(err.response?.status).toBe(401)
  })

  it('rejects token after logout even if not expired', async () => {
    await register('revoke2@test.com')
    const token = await loginGetCookie('revoke2@test.com')

    // Confirm token is valid before logout
    const before = await $fetch<{ user: { email: string } }>('/api/auth/me', {
      headers: { cookie: `auth_token=${token}` },
    })
    expect(before.user.email).toBe('revoke2@test.com')

    // Logout — server adds jti to blocklist
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'csrf-token': csrfToken, cookie: `auth_token=${token}; ${csrfCookie}` },
    })

    // Same token must now be rejected
    const err = await $fetch('/api/auth/me', {
      headers: { cookie: `auth_token=${token}` },
    }).catch((e) => e)
    expect(err.response?.status).toBe(401)
  })

  it('double logout does not throw', async () => {
    await register('dbl-logout@test.com')
    const token = await loginGetCookie('dbl-logout@test.com')

    const first = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'csrf-token': csrfToken, cookie: `auth_token=${token}; ${csrfCookie}` },
    })
    expect(first.status).toBe(200)

    const second = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'csrf-token': csrfToken, cookie: `auth_token=${token}; ${csrfCookie}` },
    })
    expect(second.status).toBe(200)
  })

  it('rejects malformed token string', async () => {
    const err = await $fetch('/api/auth/me', {
      headers: { cookie: `auth_token=not.a.jwt` },
    }).catch((e) => e)
    expect(err.response?.status).toBe(401)
  })

  it('rejects token without jti', async () => {
    const tokenWithoutJti = jwt.sign({ userId: 1, email: 'nojti@test.com' }, JWT_SECRET, {
      expiresIn: '1h',
    })

    const err = await $fetch('/api/auth/me', {
      headers: { cookie: `auth_token=${tokenWithoutJti}` },
    }).catch((e) => e)
    expect(err.response?.status).toBe(401)
  })

  it('CSRF blocks DELETE with mismatched origin', async () => {
    await register('csrf-delete@test.com')
    const token = await loginGetCookie('csrf-delete@test.com')

    // Create a task (no Origin header — allowed)
    const taskRes = await $fetch<{ task: { id: number } }>('/api/tasks', {
      method: 'POST',
      headers: { 'csrf-token': csrfToken, cookie: `auth_token=${token}; ${csrfCookie}` },
      body: { title: 'Task to delete' },
    })

    // DELETE with cross-site Origin must be rejected before auth/route handling
    const res = await fetch(`/api/tasks/${taskRes.task.id}`, {
      method: 'DELETE',
      headers: {
        cookie: `auth_token=${token}`,
        Origin: 'https://evil.com',
      },
    })
    expect(res.status).toBe(403)
  })
})
