import jwt from 'jsonwebtoken'
import type { H3Event } from 'h3'

export interface JwtPayload {
  userId: number
  email: string
}

export function signToken(payload: JwtPayload): string {
  const config = useRuntimeConfig()
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  })
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

export function requireAuth(event: H3Event): JwtPayload {
  const token = getTokenFromEvent(event)
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  try {
    return verifyToken(token)
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired token' })
  }
}
