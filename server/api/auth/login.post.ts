import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../../utils/prisma'
import { signToken } from '../../utils/jwt'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Precomputed dummy hash used when user is not found, to ensure constant-time
// response and prevent timing-based email enumeration attacks.
const DUMMY_HASH = '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ123456'

const MAX_FAILURES = 5
const LOCKOUT_MINUTES = 15

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
  const now = new Date()

  // Check per-account lockout before running bcrypt
  const attempt = await prisma.loginAttempt.findUnique({ where: { email } })
  if (attempt?.lockedUntil && attempt.lockedUntil > now) {
    const retryAfter = Math.ceil((attempt.lockedUntil.getTime() - now.getTime()) / 1000)
    setResponseHeader(event, 'Retry-After', retryAfter)
    throw createError({
      statusCode: 429,
      statusMessage: 'Account temporarily locked',
      message: 'Too many failed login attempts. Please try again later.',
    })
  }

  const user = await prisma.user.findUnique({ where: { email } })

  // Always run bcrypt.compare() to ensure consistent response time regardless
  // of whether the email exists, preventing timing-based user enumeration.
  const hashToCompare = user?.password ?? DUMMY_HASH
  const valid = await bcrypt.compare(password, hashToCompare)

  if (!user || !valid) {
    // Record failed attempt and apply lockout if threshold reached
    const currentCount = attempt?.failedCount ?? 0
    const newCount = currentCount + 1
    const lockedUntil = newCount >= MAX_FAILURES ? new Date(now.getTime() + LOCKOUT_MINUTES * 60_000) : null
    await prisma.loginAttempt.upsert({
      where: { email },
      create: { email, failedCount: 1, lockedUntil, lastAttemptAt: now },
      update: { failedCount: newCount, lockedUntil, lastAttemptAt: now },
    })
    throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
  }

  // Successful login: reset failed attempt counter
  await prisma.loginAttempt.upsert({
    where: { email },
    create: { email, failedCount: 0, lastAttemptAt: now },
    update: { failedCount: 0, lockedUntil: null, lastAttemptAt: now },
  })

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
