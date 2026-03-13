import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import prisma from '~/server/utils/prisma'

const forgotPasswordSchema = z.object({
  email: z.email('Invalid email address'),
})

const TOKEN_EXPIRY_MS = 60 * 60 * 1000 // 1 hour

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = forgotPasswordSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0].message,
    })
  }

  const { email } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })

  // Always return 200 regardless of whether the email exists to prevent enumeration
  if (!user) {
    return { success: true }
  }

  // Invalidate any existing unused tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  })

  // Generate a cryptographically random token
  const plainToken = randomBytes(32).toString('hex')
  const hashedToken = await bcrypt.hash(plainToken, 10)
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS)

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token: hashedToken,
      expiresAt,
    },
  })

  // TODO: Send email with reset link containing the token
  // Example link: https://yourapp.com/reset-password?token=<plainToken>
  // For now, log to console for development purposes
  console.log(`[PASSWORD RESET] Token for ${email}: ${plainToken}`)

  return { success: true }
})
