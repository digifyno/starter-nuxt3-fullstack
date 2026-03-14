import { defineVitestConfig } from '@nuxt/test-utils/config'
import { resolve } from 'path'

const TEST_DB_PATH = resolve(process.cwd(), 'tests', 'test.db')

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    globalSetup: ['./tests/global-setup.ts'],
    fileParallelism: false,
    pool: 'forks',
    forks: {
      singleFork: true,
    },
    testTimeout: 30000,
    hookTimeout: 15000,
    env: {
      DATABASE_URL: `file:${TEST_DB_PATH}`,
      NUXT_JWT_SECRET: 'test-jwt-secret-for-testing-minimum-32chars',
    },
  },
})
