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
    jwtSecret: (() => {
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is required')
      }
      return process.env.JWT_SECRET
    })(),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    public: {
      appName: 'Nuxt Fullstack',
      isDev: process.env.NODE_ENV !== 'production',
    },
  },

  routeRules: {
    '/**': {
      headers: {
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'",
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
