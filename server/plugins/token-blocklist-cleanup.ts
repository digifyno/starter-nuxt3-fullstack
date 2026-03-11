import { defineNitroPlugin } from 'nitropack/runtime'
import prisma from '../utils/prisma'

export default defineNitroPlugin(async () => {
  const now = new Date()
  const result = await prisma.tokenBlocklist.deleteMany({
    where: { expiresAt: { lt: now } },
  })
  if (result.count > 0) {
    console.log(`[token-blocklist-cleanup] Removed ${result.count} expired token(s)`)
  }
})
