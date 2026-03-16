import argon2 from 'argon2'
import { z } from 'zod'
import prisma from '../../utils/prisma'
import { requireAuth } from '../../utils/jwt'

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
      statusMessage: parsed.error.issues.at(0)?.message ?? 'Validation failed',
    })
  }

  const { currentPassword, newPassword } = parsed.data

  const user = await prisma.user.findUnique({ where: { id: authPayload.userId } })
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const valid = await argon2.verify(user.password, currentPassword)
  if (!valid) {
    throw createError({ statusCode: 400, statusMessage: 'Current password is incorrect' })
  }

  const hashedPassword = await argon2.hash(newPassword, { type: argon2.argon2id })

  // Setting passwordChangedAt invalidates all existing JWTs issued before this timestamp
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword, passwordChangedAt: new Date() },
  })

  return { success: true }
})
