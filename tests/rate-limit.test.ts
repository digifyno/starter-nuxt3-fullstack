// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils/e2e'
import { resolve } from 'path'

const TEST_DB_PATH = resolve(process.cwd(), 'tests', 'test.db')
const TEST_DB_URL = `file:${TEST_DB_PATH}`

// Note: tests run with RATE_LIMIT_DISABLED=1 normally — this suite must NOT set that flag
describe('Rate limiting', async () => {
  await setup({
    server: true,
    env: {
      DATABASE_URL: TEST_DB_URL,
      JWT_SECRET: 'test-jwt-secret-for-testing-minimum-32chars',
      // Intentionally omit RATE_LIMIT_DISABLED
    },
  })

  it('allows requests under the limit', async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.0.1' },
      body: JSON.stringify({ email: 'x@x.com', password: 'wrong' }),
    })
    // Should get 401 (auth failure), not 429 (rate limit)
    expect(res.status).toBe(401)
  })

  it('returns 429 with Retry-After after exceeding limit', async () => {
    // Send 11 requests from distinct test IP to exceed MAX_REQUESTS=10
    for (let i = 0; i < 10; i++) {
      await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.1.1.1' },
        body: JSON.stringify({ email: 'y@y.com', password: 'wrong' }),
      })
    }
    const limited = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.1.1.1' },
      body: JSON.stringify({ email: 'y@y.com', password: 'wrong' }),
    })
    expect(limited.status).toBe(429)
    expect(limited.headers.get('retry-after')).toBeTruthy()
  })

  it('does not rate-limit non-auth API routes', async () => {
    const res = await fetch('/api/health', { headers: { 'X-Forwarded-For': '10.2.2.2' } })
    expect(res.status).not.toBe(429)
  })

  it('tracks limits separately per IP', async () => {
    // Fill up IP A
    for (let i = 0; i < 11; i++) {
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.3.3.3' },
        body: JSON.stringify({ email: `z${i}@z.com`, password: 'Password123', name: 'T' }),
      })
    }
    // IP B should still be allowed
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.4.4.4' },
      body: JSON.stringify({ email: 'unique@unique.com', password: 'Password123', name: 'T' }),
    })
    expect(res.status).not.toBe(429)
  })
})
