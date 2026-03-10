import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/jwt'

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)

  const tasks = await prisma.task.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  return { tasks }
})
