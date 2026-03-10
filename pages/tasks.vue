<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

interface Task {
  id: number
  title: string
  description: string | null
  completed: boolean
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const tasks = ref<Task[]>([])
const newTitle = ref('')
const newDescription = ref('')
const loading = ref(true)
const error = ref('')
const validationError = ref('')
const currentPage = ref(1)
const totalPages = ref(1)
const totalTasks = ref(0)
const pageSize = 20

function validateTask(title: string, description: string): string | null {
  if (!title.trim()) return 'Title is required'
  if (title.length > 200) return 'Title must be 200 characters or less'
  if (description.length > 1000) return 'Description must be 1000 characters or less'
  return null
}

async function fetchTasks(page = currentPage.value) {
  loading.value = true
  try {
    const data = await $fetch<{ tasks: Task[]; pagination: Pagination }>('/api/tasks', {
      query: { page, limit: pageSize },
    })
    tasks.value = data.tasks
    currentPage.value = data.pagination.page
    totalPages.value = data.pagination.totalPages
    totalTasks.value = data.pagination.total
  } catch {
    error.value = 'Failed to load tasks'
  } finally {
    loading.value = false
  }
}

async function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  await fetchTasks(page)
}

async function addTask() {
  validationError.value = ''
  const err = validateTask(newTitle.value, newDescription.value)
  if (err) {
    validationError.value = err
    return
  }
  try {
    await $fetch('/api/tasks', {
      method: 'POST',
      body: { title: newTitle.value, description: newDescription.value || undefined },
    })
    newTitle.value = ''
    newDescription.value = ''
    // Refresh first page to show the new task
    await fetchTasks(1)
  } catch {
    error.value = 'Failed to create task'
  }
}

async function toggleTask(task: Task) {
  try {
    const data = await $fetch<{ task: Task }>(`/api/tasks/${task.id}`, {
      method: 'PUT',
      body: { completed: !task.completed },
    })
    const idx = tasks.value.findIndex((t) => t.id === task.id)
    if (idx !== -1) tasks.value[idx] = data.task
  } catch {
    error.value = 'Failed to update task'
  }
}

async function deleteTask(id: number) {
  if (!confirm('Delete this task? This cannot be undone.')) return
  try {
    await $fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    // Refresh current page; if it becomes empty go to previous
    const page = tasks.value.length === 1 && currentPage.value > 1 ? currentPage.value - 1 : currentPage.value
    await fetchTasks(page)
  } catch {
    error.value = 'Failed to delete task'
  }
}

const showingFrom = computed(() => {
  if (totalTasks.value === 0) return 0
  return (currentPage.value - 1) * pageSize + 1
})

const showingTo = computed(() => Math.min(currentPage.value * pageSize, totalTasks.value))

onMounted(fetchTasks)
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900">Tasks</h1>

    <form class="mt-6 space-y-3" @submit.prevent="addTask">
      <div>
        <label for="new-task-title" class="block text-sm font-medium text-gray-700">Task title</label>
        <input
          id="new-task-title"
          v-model="newTitle"
          type="text"
          required
          maxlength="200"
          class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
          placeholder="Task title"
        >
      </div>
      <div>
        <label for="new-task-description" class="block text-sm font-medium text-gray-700">Description (optional)</label>
        <textarea
          id="new-task-description"
          v-model="newDescription"
          maxlength="1000"
          rows="3"
          class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none resize-y"
          placeholder="Description (optional)"
        />
        <p class="mt-1 text-xs text-gray-400 text-right">{{ 1000 - (newDescription?.length ?? 0) }} characters remaining</p>
      </div>
      <div
        v-if="validationError"
        role="alert"
        aria-live="polite"
        class="rounded-md bg-red-50 p-3 text-sm text-red-700"
      >
        {{ validationError }}
      </div>
      <button
        type="submit"
        class="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
      >
        Add Task
      </button>
    </form>

    <div
      v-if="error"
      role="alert"
      aria-live="polite"
      class="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700"
    >
      {{ error }}
    </div>

    <div v-if="loading" class="mt-8 text-center text-gray-500">Loading...</div>

    <div v-else-if="tasks.length === 0 && totalTasks === 0" class="mt-8 text-center text-gray-500">
      No tasks yet. Create your first one above.
    </div>

    <div v-else aria-live="polite" aria-label="Task list">
      <div class="mt-6 flex items-center justify-between text-sm text-gray-500">
        <span>Showing {{ showingFrom }}–{{ showingTo }} of {{ totalTasks }} task{{ totalTasks !== 1 ? 's' : '' }}</span>
      </div>

      <ul class="mt-2 space-y-2">
        <li
          v-for="task in tasks"
          :key="task.id"
          class="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4"
        >
          <input
            type="checkbox"
            :checked="task.completed"
            :aria-label="`Mark '${task.title}' as complete`"
            class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            @change="toggleTask(task)"
          >
          <div class="flex-1 min-w-0">
            <p
              class="text-sm font-medium"
              :class="task.completed ? 'text-gray-400 line-through' : 'text-gray-900'"
            >
              {{ task.title }}
            </p>
            <p v-if="task.description" class="mt-0.5 text-xs text-gray-500 truncate">
              {{ task.description }}
            </p>
          </div>
          <button
            type="button"
            :aria-label="`Delete task '${task.title}'`"
            class="text-sm text-gray-400 hover:text-red-600"
            @click="deleteTask(task.id)"
          >
            Delete
          </button>
        </li>
      </ul>

      <div v-if="totalPages > 1" class="mt-4 flex items-center justify-center gap-2">
        <button
          type="button"
          :disabled="currentPage <= 1"
          class="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 hover:enabled:bg-gray-50"
          @click="goToPage(currentPage - 1)"
        >
          Previous
        </button>
        <span class="text-sm text-gray-600">Page {{ currentPage }} of {{ totalPages }}</span>
        <button
          type="button"
          :disabled="currentPage >= totalPages"
          class="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 hover:enabled:bg-gray-50"
          @click="goToPage(currentPage + 1)"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>
