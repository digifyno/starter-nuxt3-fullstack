import prisma from '../utils/prisma'

export default defineNitroPlugin(async () => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const { count } = await prisma.loginAttempt.deleteMany({
    where: {
      lastAttemptAt: { lt: cutoff },
      lockedUntil: null,
    },
  })
  if (count > 0) {
    console.log(`[login-attempt-cleanup] Removed ${count} stale record(s)`)
  }
})
