import prisma from '../../utils/prisma'
import { requireAuth } from '../../utils/jwt'

export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)

  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
  const skip = (page - 1) * limit

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    }),
    prisma.task.count({ where: { userId } }),
  ])

  return {
    tasks,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
})
