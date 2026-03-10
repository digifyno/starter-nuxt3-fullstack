import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/jwt'

export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, createdAt: true },
  })

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  return { user }
})
