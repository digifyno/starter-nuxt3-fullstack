import type { PrismaClient } from '@prisma/client'

export async function cleanupExpiredTokens(prismaClient: PrismaClient): Promise<number> {
  const result = await prismaClient.tokenBlocklist.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  return result.count
}
