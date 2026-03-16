import prisma from '../../utils/prisma'
import { verifyRefreshToken, signAccessToken } from '../../utils/jwt'

export default defineEventHandler(async (event) => {
  const refreshToken = getCookie(event, 'refresh_token')
  if (!refreshToken) {
    throw createError({ statusCode: 401, statusMessage: 'No refresh token' })
  }

  let userId: number
  try {
    const payload = verifyRefreshToken(refreshToken)
    userId = payload.userId
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Invalid refresh token' })
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'User not found' })
  }

  setCookie(event, 'auth_token', signAccessToken(user.id, user.email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 15,
    path: '/',
  })

  return { ok: true }
})
