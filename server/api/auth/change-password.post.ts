import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/jwt'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

export default defineEventHandler(async (event) => {
  const authPayload = await requireAuth(event)

  const body = await readBody(event)
  const parsed = changePasswordSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0].message,
    })
  }

  const { currentPassword, newPassword } = parsed.data

  const user = await prisma.user.findUnique({ where: { id: authPayload.userId } })
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) {
    throw createError({ statusCode: 400, statusMessage: 'Current password is incorrect' })
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12)

  // Setting passwordChangedAt invalidates all existing JWTs issued before this timestamp
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword, passwordChangedAt: new Date() },
  })

  return { success: true }
})
