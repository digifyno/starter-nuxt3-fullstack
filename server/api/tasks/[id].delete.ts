import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/jwt'

export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)
  const id = Number(getRouterParam(event, 'id'))

  if (isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid task ID' })
  }

  const existing = await prisma.task.findFirst({ where: { id, userId } })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Task not found' })
  }

  await prisma.task.delete({ where: { id } })

  return { success: true }
})
