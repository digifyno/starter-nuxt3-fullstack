// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-03-01',
  devtools: { enabled: true },

  modules: ['@nuxt/eslint'],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [
      (await import('@tailwindcss/vite')).default(),
    ],
  },

  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET || '',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    public: {
      appName: 'Nuxt Fullstack',
      isDev: process.env.NODE_ENV !== 'production',
    },
  },

  routeRules: {
    '/**': {
      headers: {
        // Content-Security-Policy is set dynamically via server/middleware/csp.ts
        // to include per-request nonces, eliminating the need for 'unsafe-inline'
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    },
  },

  typescript: {
    strict: true,
  },
})
