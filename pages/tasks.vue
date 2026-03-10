<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

interface Task {
  id: number
  title: string
  description: string | null
  completed: boolean
  createdAt: string
}

const tasks = ref<Task[]>([])
const newTitle = ref('')
const newDescription = ref('')
const loading = ref(true)
const error = ref('')

async function fetchTasks() {
  try {
    const data = await $fetch('/api/tasks')
    tasks.value = data.tasks
  } catch {
    error.value = 'Failed to load tasks'
  } finally {
    loading.value = false
  }
}

async function addTask() {
  if (!newTitle.value.trim()) return
  try {
    const data = await $fetch('/api/tasks', {
      method: 'POST',
      body: { title: newTitle.value, description: newDescription.value || undefined },
    })
    tasks.value.unshift(data.task)
    newTitle.value = ''
    newDescription.value = ''
  } catch {
    error.value = 'Failed to create task'
  }
}

async function toggleTask(task: Task) {
  try {
    const data = await $fetch(`/api/tasks/${task.id}`, {
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
  try {
    await $fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    tasks.value = tasks.value.filter((t) => t.id !== id)
  } catch {
    error.value = 'Failed to delete task'
  }
}

onMounted(fetchTasks)
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900">Tasks</h1>

    <form class="mt-6 space-y-3" @submit.prevent="addTask">
      <input
        v-model="newTitle"
        type="text"
        required
        class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
        placeholder="Task title"
      />
      <input
        v-model="newDescription"
        type="text"
        class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
        placeholder="Description (optional)"
      />
      <button
        type="submit"
        class="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
      >
        Add Task
      </button>
    </form>

    <div v-if="error" class="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
      {{ error }}
    </div>

    <div v-if="loading" class="mt-8 text-center text-gray-500">Loading...</div>

    <div v-else-if="tasks.length === 0" class="mt-8 text-center text-gray-500">
      No tasks yet. Create your first one above.
    </div>

    <ul v-else class="mt-6 space-y-2">
      <li
        v-for="task in tasks"
        :key="task.id"
        class="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4"
      >
        <input
          type="checkbox"
          :checked="task.completed"
          class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          @change="toggleTask(task)"
        />
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
          class="text-sm text-gray-400 hover:text-red-600"
          @click="deleteTask(task.id)"
        >
          Delete
        </button>
      </li>
    </ul>
  </div>
</template>
