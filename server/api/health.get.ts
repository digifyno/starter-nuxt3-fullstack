import prisma from '~/server/utils/prisma'

export default defineEventHandler(async () => {
  let dbStatus = 'ok'
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
    dbStatus = 'error'
  }

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus,
  }
})
