const AUTH_PATHS = ['/api/auth/login', '/api/auth/register']
const MAX_REQUESTS = 10
const WINDOW_MS = 60 * 1000 // 60 seconds

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Periodically evict expired entries to prevent unbounded Map growth with unique IPs
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // every 5 minutes
setInterval(() => {
  const now = Date.now()
  store.forEach((entry, key) => {
    if (now >= entry.resetAt) store.delete(key)
  })
}, CLEANUP_INTERVAL_MS).unref()

export default defineEventHandler((event) => {
  // Disabled in test environment to allow integration tests to run without hitting limits
  if (process.env.RATE_LIMIT_DISABLED === '1') {
    return
  }

  const path = event.path

  if (!AUTH_PATHS.includes(path)) {
    return
  }

  // Use X-Forwarded-For to get the real client IP when behind a reverse proxy (e.g. nginx)
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
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
