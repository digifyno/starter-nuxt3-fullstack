import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient()
} else {
  if (!globalThis.__prisma) {
    globalThis.__prisma = new PrismaClient()
  }
  prisma = globalThis.__prisma
}

export default prisma
