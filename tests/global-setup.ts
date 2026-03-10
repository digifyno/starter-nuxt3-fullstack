import { execSync } from 'child_process'
import { existsSync, unlinkSync } from 'fs'
import { resolve } from 'path'

const TEST_DB_PATH = resolve(process.cwd(), 'tests', 'test.db')
const TEST_DB_URL = `file:${TEST_DB_PATH}`

export function setup() {
  // Remove old test DB so we start from a clean slate (no --force-reset needed)
  if (existsSync(TEST_DB_PATH)) {
    unlinkSync(TEST_DB_PATH)
  }

  // Push schema to the fresh empty database
  execSync('npx prisma db push --skip-generate', {
    env: {
      ...process.env,
      DATABASE_URL: TEST_DB_URL,
    },
    stdio: 'inherit',
    cwd: process.cwd(),
  })
}
