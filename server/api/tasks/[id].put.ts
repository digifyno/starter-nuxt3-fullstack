import { z } from 'zod'
import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/jwt'

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  completed: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)
  const id = Number(getRouterParam(event, 'id'))

  if (isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid task ID' })
  }

  const existing = await prisma.task.findFirst({ where: { id, userId } })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Task not found' })
  }

  const body = await readBody(event)
  const parsed = updateTaskSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.errors[0].message,
    })
  }

  const task = await prisma.task.update({
    where: { id },
    data: parsed.data,
  })

  return { task }
})
