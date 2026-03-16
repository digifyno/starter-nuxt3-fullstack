// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils/e2e'
import { PrismaClient } from '@prisma/client'
import { resolve } from 'path'

const TEST_DB_PATH = resolve(process.cwd(), 'tests', 'test.db')
const TEST_DB_URL = `file:${TEST_DB_PATH}`

const prisma = new PrismaClient({ datasourceUrl: TEST_DB_URL })

/**
 * Extract the CSRF token and cookie from a page response.
 * nuxt-csurf injects <meta name="csrf-token" content="..."> into every HTML page
 * and sets the secret in an httpOnly cookie.
 */
async function getCsrfCredentials(): Promise<{ token: string; cookieHeader: string }> {
  const res = await fetch('/')
  const html = await res.text()
  const token = html.match(/<meta name="csrf-token" content="([^"]+)"/)?.[1] ?? ''
  const setCookie = res.headers.get('set-cookie') ?? ''
  // Cookie key is "csrf" in non-https (dev/test) and "__Host-csrf" in https (prod)
  const cookieMatch = setCookie.match(/(?:^|,\s*)(?:__Host-)?csrf=([^;,]+)/)
  const cookieName = setCookie.includes('__Host-csrf') ? '__Host-csrf' : 'csrf'
  const cookieValue = cookieMatch?.[1] ?? ''
  return { token, cookieHeader: `${cookieName}=${cookieValue}` }
}

describe('CSRF protection (nuxt-csurf)', async () => {
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

  beforeEach(async () => {
    await prisma.tokenBlocklist.deleteMany()
    await prisma.task.deleteMany()
    await prisma.user.deleteMany()
  })

  it('blocks POST without CSRF token', async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'Password123' }),
    })
    expect(res.status).toBe(403)
  })

  it('blocks POST with invalid CSRF token', async () => {
    const { cookieHeader } = await getCsrfCredentials()
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'csrf-token': 'invalid-token-value',
      },
      body: JSON.stringify({ email: 'test@test.com', password: 'Password123' }),
    })
    expect(res.status).toBe(403)
  })

  it('allows POST with valid CSRF token and cookie', async () => {
    const { token, cookieHeader } = await getCsrfCredentials()
    expect(token).toBeTruthy()

    // Register first so login can succeed
    await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'csrf-token': token,
      },
      body: JSON.stringify({ email: 'csrf@test.com', password: 'Password123', name: 'CSRF Test' }),
    })

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'csrf-token': token,
      },
      body: JSON.stringify({ email: 'csrf@test.com', password: 'Password123' }),
    })
    expect(res.status).toBe(200)
  })

  it('allows GET requests without CSRF token', async () => {
    const res = await fetch('/api/health', {
      method: 'GET',
    })
    expect(res.status).toBe(200)
  })

  it('blocks DELETE without CSRF token', async () => {
    const res = await fetch('/api/tasks/1', {
      method: 'DELETE',
    })
    // 403 CSRF error (or 401 auth error if CSRF check passes but auth fails)
    // The important thing is it's not 200
    expect(res.status).not.toBe(200)
    // CSRF should trigger before auth, so 403 expected
    expect(res.status).toBe(403)
  })
})
