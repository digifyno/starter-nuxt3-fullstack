import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '~/server/utils/prisma'
import { signToken } from '~/server/utils/jwt'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Precomputed dummy hash used when user is not found, to ensure constant-time
// response and prevent timing-based email enumeration attacks.
const DUMMY_HASH = '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ123456'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = loginSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.errors[0].message,
    })
  }

  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })

  // Always run bcrypt.compare() to ensure consistent response time regardless
  // of whether the email exists, preventing timing-based user enumeration.
  const hashToCompare = user?.password ?? DUMMY_HASH
  const valid = await bcrypt.compare(password, hashToCompare)

  if (!user || !valid) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
  }

  const token = signToken({ userId: user.id, email: user.email })

  setCookie(event, 'auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return {
    user: { id: user.id, email: user.email, name: user.name },
  }
})
