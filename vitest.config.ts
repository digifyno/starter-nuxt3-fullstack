import { defineVitestConfig } from '@nuxt/test-utils/config'
import { resolve } from 'path'

const TEST_DB_PATH = resolve(process.cwd(), 'tests', 'test.db')

export default defineVitestConfig({
  resolve: {
    alias: {
      // magic-string changed its export style; alias to the ESM build so that
      // @vue/compiler-sfc's CJS require() gets the constructor directly via
      // Vite's ESM interop rather than a namespace object that breaks `new`.
      'magic-string': 'magic-string/dist/magic-string.es.mjs',
    },
  },
  test: {
    environment: 'nuxt',
    globalSetup: ['./tests/global-setup.ts'],
    fileParallelism: false,
    pool: 'forks',
    forks: {
      singleFork: true,
    },
    testTimeout: 60000,
    hookTimeout: 30000,
    env: {
      DATABASE_URL: `file:${TEST_DB_PATH}`,
      NUXT_JWT_SECRET: 'test-jwt-secret-for-testing-minimum-32chars',
    },
  },
})
