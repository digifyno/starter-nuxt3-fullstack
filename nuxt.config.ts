// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },

  modules: ['@nuxt/eslint', 'nuxt-security'],

  security: {
    headers: {
      contentSecurityPolicy: {
        'base-uri': ["'none'"],
        'default-src': ["'self'"],
        'script-src': ["'self'", "'strict-dynamic'", "'nonce-{{nonce}}'"],
        'style-src': ["'self'", "'nonce-{{nonce}}'"],
        'img-src': ["'self'", 'data:'],
        'font-src': ["'self'"],
        'connect-src': ["'self'"],
        'frame-ancestors': ["'none'"],
        'object-src': ["'none'"],
        'form-action': ["'self'"],
        'upgrade-insecure-requests': true,
      },
      strictTransportSecurity: {
        maxAge: 63072000,
        includeSubdomains: true,
        preload: true,
      },
      xFrameOptions: 'DENY',
      xContentTypeOptions: 'nosniff',
      referrerPolicy: 'strict-origin-when-cross-origin',
      permissionsPolicy: {
        camera: [],
        microphone: [],
        geolocation: [],
      },
      // Disable headers not in our original configuration
      crossOriginResourcePolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginEmbedderPolicy: false,
      xDNSPrefetchControl: false,
      xDownloadOptions: false,
      xPermittedCrossDomainPolicies: false,
      xXSSProtection: false,
      originAgentCluster: false,
    },
    csrf: {
      cookie: {
        httpOnly: true,
        sameSite: 'strict',
      },
      methodsToProtect: ['POST', 'PUT', 'PATCH', 'DELETE'],
      addCsrfTokenToEventCtx: true,
    },
    // Use our custom rate-limit middleware (more granular per-route config)
    rateLimiter: false,
    // Disable validators/handlers not needed for this app
    xssValidator: false,
    corsHandler: false,
    requestSizeLimiter: false,
  },

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [
      (await import('@tailwindcss/vite')).default(),
    ],
    build: {
      // @rollup/plugin-commonjs: when a CJS module (e.g. @vue/compiler-sfc)
      // requires another CJS module whose module.exports is a single function
      // (e.g. magic-string), return that function directly instead of wrapping
      // it in a namespace object — preventing "MagicString is not a constructor".
      commonjsOptions: {
        requireReturnsDefault: 'auto',
      },
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      titleTemplate: '%s',
    },
  },

  nitro: {
    output: {
      dir: 'dist',
    },
    externals: {
      external: ['argon2', 'node-gyp-build'],
    },
  },

  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET || '',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    public: {
      appName: 'Nuxt Fullstack',
      isDev: process.env.NODE_ENV !== 'production',
    },
  },

  typescript: {
    strict: true,
  },
})
