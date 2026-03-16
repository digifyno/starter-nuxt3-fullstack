import argon2 from 'argon2'
import { z } from 'zod'
import prisma from '../../utils/prisma'
import { signAccessToken, signRefreshToken } from '../../utils/jwt'

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = registerSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues.at(0)?.message ?? 'Validation failed',
    })
  }

  const { email, name, password } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Email already registered' })
  }

  const hashedPassword = await argon2.hash(password, { type: argon2.argon2id })
  const user = await prisma.user.create({
    data: { email, name, password: hashedPassword },
  })

  const isProduction = process.env.NODE_ENV === 'production'

  setCookie(event, 'auth_token', signAccessToken(user.id, user.email), {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 60 * 15,
    path: '/',
  })

  setCookie(event, 'refresh_token', signRefreshToken(user.id), {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/api/auth/refresh',
  })

  return {
    user: { id: user.id, email: user.email, name: user.name },
  }
})
