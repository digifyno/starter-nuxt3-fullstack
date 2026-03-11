import { defineNitroPlugin } from 'nitropack/runtime'
import prisma from '../utils/prisma'
import { cleanupExpiredTokens } from '../utils/token-cleanup'

export default defineNitroPlugin(async () => {
  const count = await cleanupExpiredTokens(prisma)
  if (count > 0) {
    console.log(`[token-blocklist-cleanup] Removed ${count} expired token(s)`)
  }
})
