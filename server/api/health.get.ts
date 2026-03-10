import prisma from '~/server/utils/prisma'

export default defineEventHandler(async () => {
  let dbStatus = 'ok'
  try {
    await prisma.$queryRaw`SELECT 1`
    // Prune expired token blocklist entries
    await prisma.tokenBlocklist.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    })
  } catch {
    dbStatus = 'error'
  }

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus,
  }
})
