import jwt from 'jsonwebtoken'
import type { H3Event } from 'h3'
import prisma from '~/server/utils/prisma'

export interface JwtPayload {
  userId: number
  email: string
  jti: string
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

  if (payload.jti) {
    const blocked = await prisma.tokenBlocklist.findUnique({ where: { jti: payload.jti } })
    if (blocked) {
      throw createError({ statusCode: 401, statusMessage: 'Token has been revoked' })
    }
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
