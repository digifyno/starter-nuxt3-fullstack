import { randomBytes } from 'node:crypto'

export default defineEventHandler((event) => {
  const nonce = randomBytes(16).toString('base64')

  // Store nonce in event context — Nuxt's SSR renderer will automatically
  // apply it to inline <script> and <style> tags it generates
  event.context.nonce = nonce

  setResponseHeader(
    event,
    'Content-Security-Policy',
    [
      `default-src 'self'`,
      `script-src 'self' 'nonce-${nonce}'`,
      `style-src 'self' 'nonce-${nonce}'`,
      `img-src 'self' data:`,
      `font-src 'self'`,
      `connect-src 'self'`,
      `frame-ancestors 'none'`,
    ].join('; '),
  )
})
