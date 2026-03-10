import { z } from 'zod'
import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/jwt'

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
})

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)
  const body = await readBody(event)
  const parsed = createTaskSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.errors[0].message,
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
