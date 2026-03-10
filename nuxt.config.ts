// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-03-01',
  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [
      // @ts-expect-error - Tailwind CSS 4 Vite plugin
      (await import('@tailwindcss/vite')).default(),
    ],
  },

  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    public: {
      appName: 'Nuxt Fullstack',
    },
  },

  typescript: {
    strict: true,
  },
})
