import { z } from 'zod'
import prisma from '../../utils/prisma'
import { requireAuth } from '../../utils/jwt'

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
})

export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)
  const body = await readBody(event)
  const parsed = createTaskSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues.at(0)?.message ?? 'Validation failed',
    })
  }

  const task = await prisma.task.create({
    data: {
      ...parsed.data,
      userId,
    },
  })

  return { task }
})
