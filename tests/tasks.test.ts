// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { setup, $fetch, fetch } from '@nuxt/test-utils/e2e'
import { PrismaClient } from '@prisma/client'
import { resolve } from 'path'

const TEST_DB_PATH = resolve(process.cwd(), 'tests', 'test.db')
const TEST_DB_URL = `file:${TEST_DB_PATH}`

const prisma = new PrismaClient({ datasourceUrl: TEST_DB_URL })

describe('Tasks API', async () => {
  await setup({
    server: true,
    env: {
      DATABASE_URL: TEST_DB_URL,
      JWT_SECRET: 'test-jwt-secret-for-testing-minimum-32chars',
      RATE_LIMIT_DISABLED: '1',
    },
  })

  beforeEach(async () => {
    await prisma.task.deleteMany()
    await prisma.user.deleteMany()
  })

  async function createUserAndGetCookie(email: string): Promise<string> {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: { email, password: 'Password123', name: 'Test User' },
    })
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'Password123' }),
    })
    const setCookie = res.headers.get('set-cookie') ?? ''
    const match = setCookie.match(/auth_token=([^;]+)/)
    return match?.[1] ?? ''
  }

  describe('GET /api/tasks', () => {
    it('returns empty list for new user', async () => {
      const cookie = await createUserAndGetCookie('empty@test.com')
      const result = await $fetch<{ tasks: unknown[] }>('/api/tasks', {
        headers: { cookie: `auth_token=${cookie}` },
      })
      expect(result.tasks).toEqual([])
    })

    it("returns only current user's tasks (isolation)", async () => {
      const cookie1 = await createUserAndGetCookie('user1@test.com')
      const cookie2 = await createUserAndGetCookie('user2@test.com')

      await $fetch('/api/tasks', {
        method: 'POST',
        headers: { cookie: `auth_token=${cookie1}` },
        body: { title: 'User1 Task' },
      })

      await $fetch('/api/tasks', {
        method: 'POST',
        headers: { cookie: `auth_token=${cookie2}` },
        body: { title: 'User2 Task' },
      })

      const result1 = await $fetch<{ tasks: Array<{ title: string }> }>('/api/tasks', {
        headers: { cookie: `auth_token=${cookie1}` },
      })
      expect(result1.tasks).toHaveLength(1)
      expect(result1.tasks[0].title).toBe('User1 Task')

      const result2 = await $fetch<{ tasks: Array<{ title: string }> }>('/api/tasks', {
        headers: { cookie: `auth_token=${cookie2}` },
      })
      expect(result2.tasks).toHaveLength(1)
      expect(result2.tasks[0].title).toBe('User2 Task')
    })
  })

  describe('POST /api/tasks', () => {
    it('creates task and returns it with id', async () => {
      const cookie = await createUserAndGetCookie('create@test.com')
      const result = await $fetch<{ task: { id: number; title: string } }>('/api/tasks', {
        method: 'POST',
        headers: { cookie: `auth_token=${cookie}` },
        body: { title: 'My Task', description: 'Task description' },
      })
      expect(result.task.id).toBeDefined()
      expect(result.task.title).toBe('My Task')
    })

    it('returns 400 for missing title', async () => {
      const cookie = await createUserAndGetCookie('notitle@test.com')
      const err = await $fetch('/api/tasks', {
        method: 'POST',
        headers: { cookie: `auth_token=${cookie}` },
        body: { description: 'No title here' },
      }).catch((e) => e)
      expect(err.response?.status).toBe(400)
    })
  })

  describe('PUT /api/tasks/:id', () => {
    it('updates task', async () => {
      const cookie = await createUserAndGetCookie('update@test.com')
      const created = await $fetch<{ task: { id: number } }>('/api/tasks', {
        method: 'POST',
        headers: { cookie: `auth_token=${cookie}` },
        body: { title: 'Original Title' },
      })

      const updated = await $fetch<{ task: { title: string; completed: boolean } }>(
        `/api/tasks/${created.task.id}`,
        {
          method: 'PUT',
          headers: { cookie: `auth_token=${cookie}` },
          body: { title: 'Updated Title', completed: true },
        },
      )

      expect(updated.task.title).toBe('Updated Title')
      expect(updated.task.completed).toBe(true)
    })

    it("returns 404 for another user's task", async () => {
      const cookie1 = await createUserAndGetCookie('owner@test.com')
      const cookie2 = await createUserAndGetCookie('other@test.com')

      const created = await $fetch<{ task: { id: number } }>('/api/tasks', {
        method: 'POST',
        headers: { cookie: `auth_token=${cookie1}` },
        body: { title: 'Owner Task' },
      })

      const err = await $fetch(`/api/tasks/${created.task.id}`, {
        method: 'PUT',
        headers: { cookie: `auth_token=${cookie2}` },
        body: { title: 'Hijack' },
      }).catch((e) => e)

      expect(err.response?.status).toBe(404)
    })
  })

  describe('DELETE /api/tasks/:id', () => {
    it('deletes task', async () => {
      const cookie = await createUserAndGetCookie('delete@test.com')
      const created = await $fetch<{ task: { id: number } }>('/api/tasks', {
        method: 'POST',
        headers: { cookie: `auth_token=${cookie}` },
        body: { title: 'To Delete' },
      })

      await $fetch(`/api/tasks/${created.task.id}`, {
        method: 'DELETE',
        headers: { cookie: `auth_token=${cookie}` },
      })

      const tasks = await $fetch<{ tasks: unknown[] }>('/api/tasks', {
        headers: { cookie: `auth_token=${cookie}` },
      })
      expect(tasks.tasks).toHaveLength(0)
    })

    it("returns 404 for another user's task", async () => {
      const cookie1 = await createUserAndGetCookie('delowner@test.com')
      const cookie2 = await createUserAndGetCookie('delother@test.com')

      const created = await $fetch<{ task: { id: number } }>('/api/tasks', {
        method: 'POST',
        headers: { cookie: `auth_token=${cookie1}` },
        body: { title: 'Protected Task' },
      })

      const err = await $fetch(`/api/tasks/${created.task.id}`, {
        method: 'DELETE',
        headers: { cookie: `auth_token=${cookie2}` },
      }).catch((e) => e)

      expect(err.response?.status).toBe(404)
    })
  })

  describe('Task pagination edge cases', () => {
    it('page=0 defaults to page 1', async () => {
      const cookie = await createUserAndGetCookie('page0@test.com')
      const result = await $fetch<{ tasks: unknown[]; pagination: { page: number } }>(
        '/api/tasks?page=0',
        { headers: { cookie: `auth_token=${cookie}` } },
      )
      expect(result.pagination.page).toBe(1)
    })

    it('limit=0 defaults to 20', async () => {
      const cookie = await createUserAndGetCookie('limit0@test.com')
      const result = await $fetch<{ tasks: unknown[]; pagination: { limit: number } }>(
        '/api/tasks?limit=0',
        { headers: { cookie: `auth_token=${cookie}` } },
      )
      expect(result.pagination.limit).toBe(20)
    })

    it('limit=101 is capped at 100', async () => {
      const cookie = await createUserAndGetCookie('limit101@test.com')
      const result = await $fetch<{ tasks: unknown[]; pagination: { limit: number } }>(
        '/api/tasks?limit=101',
        { headers: { cookie: `auth_token=${cookie}` } },
      )
      expect(result.pagination.limit).toBe(100)
    })

    it('page beyond totalPages returns empty tasks array', async () => {
      const cookie = await createUserAndGetCookie('beyondpage@test.com')
      const result = await $fetch<{ tasks: unknown[]; pagination: { total: number } }>(
        '/api/tasks?page=999',
        { headers: { cookie: `auth_token=${cookie}` } },
      )
      expect(result.tasks).toEqual([])
      expect(result.pagination.total).toBe(0)
    })
  })
})
