import argon2 from 'argon2'
import { z } from 'zod'
import prisma from '../../utils/prisma'

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = resetPasswordSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.errors[0].message,
    })
  }

  const { token, newPassword } = parsed.data
  const now = new Date()

  // Find all unexpired, unused tokens and check for a match
  const candidates = await prisma.passwordResetToken.findMany({
    where: {
      usedAt: null,
      expiresAt: { gt: now },
    },
    select: { id: true, token: true, userId: true },
  })

  let matchedToken: { id: string; userId: number } | null = null
  for (const candidate of candidates) {
    const isMatch = await argon2.verify(candidate.token, token)
    if (isMatch) {
      matchedToken = { id: candidate.id, userId: candidate.userId }
      break
    }
  }

  if (!matchedToken) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid or expired reset token',
    })
  }

  const hashedPassword = await argon2.hash(newPassword, { type: argon2.argon2id })
  const passwordChangedAt = new Date()

  // Update password, set passwordChangedAt to invalidate all existing JWTs,
  // and mark the token as used — all in a single transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: matchedToken.userId },
      data: { password: hashedPassword, passwordChangedAt },
    }),
    prisma.passwordResetToken.update({
      where: { id: matchedToken.id },
      data: { usedAt: passwordChangedAt },
    }),
  ])

  return { success: true }
})
