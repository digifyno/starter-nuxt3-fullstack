// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils/e2e'
import { resolve } from 'path'

const TEST_DB_PATH = resolve(process.cwd(), 'tests', 'test.db')
const TEST_DB_URL = `file:${TEST_DB_PATH}`

describe('Security headers', async () => {
  await setup({
    server: true,
    env: {
      DATABASE_URL: TEST_DB_URL,
      JWT_SECRET: 'test-jwt-secret-for-testing-minimum-32chars',
      RATE_LIMIT_DISABLED: '1',
    },
  })

  it('sets X-Content-Type-Options: nosniff on API routes', async () => {
    const res = await fetch('/api/health')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('sets X-Content-Type-Options: nosniff on page routes', async () => {
    const res = await fetch('/')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('sets X-Frame-Options: DENY', async () => {
    const res = await fetch('/')
    expect(res.headers.get('x-frame-options')).toBe('DENY')
  })

  it('sets Referrer-Policy: strict-origin-when-cross-origin', async () => {
    const res = await fetch('/')
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
  })

  it('sets Strict-Transport-Security header', async () => {
    const res = await fetch('/')
    expect(res.headers.get('strict-transport-security')).toBe('max-age=63072000; includeSubDomains; preload')
  })

  it('sets Permissions-Policy header', async () => {
    const res = await fetch('/')
    expect(res.headers.get('permissions-policy')).toBe('camera=(), microphone=(), geolocation=()')
  })
})
