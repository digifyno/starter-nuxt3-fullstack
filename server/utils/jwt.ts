import jwt from 'jsonwebtoken'
import type { H3Event } from 'h3'
import prisma from './prisma'

export interface JwtPayload {
  userId: number
  email: string
  jti: string
  type?: 'access' | 'refresh'
  iat?: number
  exp?: number
}

export function signToken(payload: Omit<JwtPayload, 'jti'>): string {
  const config = useRuntimeConfig()
  return jwt.sign(
    { ...payload, jti: crypto.randomUUID() },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as string } as jwt.SignOptions,
  )
}

export function signAccessToken(userId: number, email: string): string {
  const config = useRuntimeConfig()
  return jwt.sign(
    { userId, email, type: 'access', jti: crypto.randomUUID() },
    config.jwtSecret,
    { expiresIn: '15m' } as jwt.SignOptions,
  )
}

export function signRefreshToken(userId: number): string {
  const config = useRuntimeConfig()
  return jwt.sign(
    { userId, type: 'refresh', jti: crypto.randomUUID() },
    config.jwtSecret,
    { expiresIn: '7d' } as jwt.SignOptions,
  )
}

export function verifyRefreshToken(token: string): { userId: number } {
  const config = useRuntimeConfig()
  const payload = jwt.verify(token, config.jwtSecret) as JwtPayload
  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type')
  }
  return { userId: payload.userId }
}

export function verifyToken(token: string): JwtPayload {
  const config = useRuntimeConfig()
  return jwt.verify(token, config.jwtSecret) as JwtPayload
}

export function getTokenFromEvent(event: H3Event): string | null {
  const auth = getHeader(event, 'authorization')
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7)
  }

  const cookie = getCookie(event, 'auth_token')
  if (cookie) {
    return cookie
  }

  return null
}

export async function requireAuth(event: H3Event): Promise<JwtPayload> {
  const token = getTokenFromEvent(event)
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  let payload: JwtPayload
  try {
    payload = verifyToken(token)
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired token' })
  }

  // Reject refresh tokens used as access tokens
  if (payload.type === 'refresh') {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token type' })
  }

  if (!payload.jti) {
    throw createError({ statusCode: 401, statusMessage: 'Token missing required jti claim' })
  }

  const blocked = await prisma.tokenBlocklist.findUnique({ where: { jti: payload.jti } })
  if (blocked) {
    throw createError({ statusCode: 401, statusMessage: 'Token has been revoked' })
  }

  // Reject tokens issued before the user's last password change
  if (payload.iat) {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { passwordChangedAt: true },
    })
    if (user?.passwordChangedAt) {
      const passwordChangedAtSec = Math.floor(user.passwordChangedAt.getTime() / 1000)
      if (payload.iat <= passwordChangedAtSec) {
        throw createError({ statusCode: 401, statusMessage: 'Token has been invalidated due to password change' })
      }
    }
  }

  return payload
}
