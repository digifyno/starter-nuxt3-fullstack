import prisma from '../../utils/prisma'
import { verifyToken } from '../../utils/jwt'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'auth_token')
  if (token) {
    try {
      const payload = verifyToken(token)
      if (payload?.jti && payload?.exp) {
        await prisma.tokenBlocklist.create({
          data: { jti: payload.jti, expiresAt: new Date(payload.exp * 1000) },
        })
      }
    } catch {
      // ignore invalid tokens
    }
  }
  deleteCookie(event, 'auth_token', { path: '/' })
  deleteCookie(event, 'refresh_token', { path: '/api/auth/refresh' })
  return { success: true }
})
