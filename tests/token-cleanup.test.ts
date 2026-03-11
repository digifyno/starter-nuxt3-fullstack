// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { resolve } from 'path'
import { cleanupExpiredTokens } from '../server/utils/token-cleanup'

const TEST_DB_PATH = resolve(process.cwd(), 'tests', 'test.db')
const TEST_DB_URL = `file:${TEST_DB_PATH}`

const prisma = new PrismaClient({ datasourceUrl: TEST_DB_URL })

describe('Token blocklist cleanup', () => {
  beforeEach(async () => {
    await prisma.tokenBlocklist.deleteMany()
  })

  it('removes expired entries and keeps non-expired entries', async () => {
    const now = new Date()
    const pastDate = new Date(now.getTime() - 1000) // 1 second ago (expired)
    const futureDate = new Date(now.getTime() + 60_000) // 60 seconds from now (valid)

    await prisma.tokenBlocklist.createMany({
      data: [
        { jti: 'expired-jti-1', expiresAt: pastDate },
        { jti: 'expired-jti-2', expiresAt: pastDate },
        { jti: 'valid-jti-1', expiresAt: futureDate },
      ],
    })

    const removedCount = await cleanupExpiredTokens(prisma)

    expect(removedCount).toBe(2)

    const remaining = await prisma.tokenBlocklist.findMany()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].jti).toBe('valid-jti-1')
  })

  it('returns 0 when there are no expired entries', async () => {
    const futureDate = new Date(Date.now() + 60_000)
    await prisma.tokenBlocklist.create({ data: { jti: 'valid-jti', expiresAt: futureDate } })

    const removedCount = await cleanupExpiredTokens(prisma)

    expect(removedCount).toBe(0)
    const remaining = await prisma.tokenBlocklist.findMany()
    expect(remaining).toHaveLength(1)
  })

  it('returns 0 when the blocklist is empty', async () => {
    const removedCount = await cleanupExpiredTokens(prisma)
    expect(removedCount).toBe(0)
  })
})
