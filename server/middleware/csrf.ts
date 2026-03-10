const MUTATION_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH']

export default defineEventHandler((event) => {
  if (!MUTATION_METHODS.includes(event.method)) return
  if (!event.path.startsWith('/api/')) return

  const origin = getHeader(event, 'origin')

  // No Origin header: allow (curl, server-to-server, same-origin non-navigation requests)
  if (!origin) return

  // Allow localhost origins in development
  if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return

  // Validate against configured site URL or derived host
  const host = getHeader(event, 'host')
  const allowedOrigin = process.env.NUXT_PUBLIC_SITE_URL || `https://${host}`

  if (origin !== allowedOrigin) {
    throw createError({ statusCode: 403, statusMessage: 'CSRF check failed' })
  }
})
