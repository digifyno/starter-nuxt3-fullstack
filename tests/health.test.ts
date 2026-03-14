// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'
import { PrismaClient } from '@prisma/client'
import { resolve } from 'path'

const TEST_DB_PATH = resolve(process.cwd(), 'tests', 'test.db')
const TEST_DB_URL = `file:${TEST_DB_PATH}`

const prisma = new PrismaClient({ datasourceUrl: TEST_DB_URL })

describe('Health endpoint', async () => {
  await setup({
    build: true,
    server: true,
    env: {
      DATABASE_URL: TEST_DB_URL,
      NUXT_JWT_SECRET: 'test-jwt-secret-for-testing-minimum-32chars',
      RATE_LIMIT_DISABLED: '1',
    },
  })

  beforeEach(async () => {
    await prisma.tokenBlocklist.deleteMany()
  })

  it('returns expected response shape', async () => {
    const result = await $fetch<{ status: string; timestamp: string; database: string }>('/api/health')
    expect(result.status).toBe('ok')
    expect(typeof result.timestamp).toBe('string')
    expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0)
    expect(result.database).toBe('ok')
  })

  it('removes expired tokens from blocklist', async () => {
    const now = new Date()
    await prisma.tokenBlocklist.createMany({
      data: [
        { jti: 'expired-jti', expiresAt: new Date(now.getTime() - 1000) },
        { jti: 'valid-jti', expiresAt: new Date(now.getTime() + 60_000) },
      ],
    })

    await $fetch('/api/health')

    const remaining = await prisma.tokenBlocklist.findMany()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].jti).toBe('valid-jti')
  })
})
