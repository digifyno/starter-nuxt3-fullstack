// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils/e2e'
import { PrismaClient } from '@prisma/client'
import { resolve } from 'path'

const TEST_DB_PATH = resolve(process.cwd(), 'tests', 'test.db')
const TEST_DB_URL = `file:${TEST_DB_PATH}`

const prisma = new PrismaClient({ datasourceUrl: TEST_DB_URL })

describe('CSRF middleware', async () => {
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
  })

  it('blocks POST with mismatched Origin header', async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil.com',
      },
      body: JSON.stringify({ email: 'test@test.com', password: 'password123' }),
    })
    expect(res.status).toBe(403)
  })

  it('allows POST with localhost Origin header', async () => {
    // Register first so login can succeed
    await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
      body: JSON.stringify({ email: 'csrf@test.com', password: 'password123', name: 'CSRF Test' }),
    })
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:3000',
      },
      body: JSON.stringify({ email: 'csrf@test.com', password: 'password123' }),
    })
    expect(res.status).toBe(200)
  })

  it('does not block GET requests regardless of Origin', async () => {
    const res = await fetch('/api/health', {
      method: 'GET',
      headers: { Origin: 'https://evil.com' },
    })
    expect(res.status).toBe(200)
  })

  it('allows POST without Origin header (curl/server-to-server)', async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'noorigin@test.com', password: 'password123' }),
    })
    // Should not be 403 (may be 401 due to wrong credentials, but not CSRF blocked)
    expect(res.status).not.toBe(403)
  })
})
