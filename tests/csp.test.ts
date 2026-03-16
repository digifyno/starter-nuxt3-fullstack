// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils/e2e'
import { resolve } from 'path'

const TEST_DB_PATH = resolve(process.cwd(), 'tests', 'test.db')
const TEST_DB_URL = `file:${TEST_DB_PATH}`

describe('Content-Security-Policy', async () => {
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

  it('sets a Content-Security-Policy header', async () => {
    const res = await fetch('/')
    expect(res.headers.get('content-security-policy')).toBeTruthy()
  })

  it('does not include unsafe-inline in script-src', async () => {
    const res = await fetch('/')
    const csp = res.headers.get('content-security-policy') ?? ''
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src'))
    expect(scriptSrc).toBeDefined()
    expect(scriptSrc).not.toContain("'unsafe-inline'")
  })

  it('does not include unsafe-inline in style-src', async () => {
    const res = await fetch('/')
    const csp = res.headers.get('content-security-policy') ?? ''
    const styleSrc = csp.split(';').find((d) => d.trim().startsWith('style-src'))
    expect(styleSrc).toBeDefined()
    expect(styleSrc).not.toContain("'unsafe-inline'")
  })

  it('includes a nonce in script-src', async () => {
    const res = await fetch('/')
    const csp = res.headers.get('content-security-policy') ?? ''
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src '))
    expect(scriptSrc).toMatch(/'nonce-[A-Za-z0-9+/]+=*'/)
  })

  it('generates a different nonce per request', async () => {
    const res1 = await fetch('/')
    const res2 = await fetch('/')
    const csp1 = res1.headers.get('content-security-policy') ?? ''
    const csp2 = res2.headers.get('content-security-policy') ?? ''
    const nonce1 = csp1.match(/'nonce-([A-Za-z0-9+/]+=*)'/)?.[1]
    const nonce2 = csp2.match(/'nonce-([A-Za-z0-9+/]+=*)'/)?.[1]
    expect(nonce1).toBeTruthy()
    expect(nonce2).toBeTruthy()
    expect(nonce1).not.toBe(nonce2)
  })
})
