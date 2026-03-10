const AUTH_PATHS = ['/api/auth/login', '/api/auth/register']
const MAX_REQUESTS = 10
const WINDOW_MS = 60 * 1000 // 60 seconds

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

export default defineEventHandler((event) => {
  const path = event.path

  if (!AUTH_PATHS.includes(path)) {
    return
  }

  const ip = getRequestIP(event, { xForwardedFor: false }) ?? 'unknown'
  const key = `${ip}:${path}`
  const now = Date.now()

  const entry = store.get(key)

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return
  }

  entry.count++

  if (entry.count > MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    setResponseHeaders(event, {
      'Retry-After': String(retryAfter),
    })
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
    })
  }
})
