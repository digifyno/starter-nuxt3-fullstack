<script setup lang="ts">
const { register, isAuthenticated } = useAuth()

const email = ref('')
const name = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

if (isAuthenticated.value) {
  navigateTo('/tasks')
}

async function handleRegister() {
  error.value = ''
  loading.value = true
  try {
    await register(email.value, name.value, password.value)
    navigateTo('/tasks')
  } catch (e: unknown) {
    const fetchError = e as { data?: { message?: string }; statusMessage?: string }
    error.value = fetchError.data?.message || fetchError.statusMessage || 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm py-12">
    <h1 class="text-2xl font-bold text-gray-900">Create Account</h1>
    <p class="mt-2 text-sm text-gray-600">
      Already have an account?
      <NuxtLink to="/login" class="text-primary-600 hover:text-primary-700">Login</NuxtLink>
    </p>

    <form class="mt-6 space-y-4" @submit.prevent="handleRegister">
      <div v-if="error" class="rounded-md bg-red-50 p-3 text-sm text-red-700">
        {{ error }}
      </div>

      <div>
        <label for="name" class="block text-sm font-medium text-gray-700">Name</label>
        <input
          id="name"
          v-model="name"
          type="text"
          required
          class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
          placeholder="Your name"
        />
      </div>

      <div>
        <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          minlength="6"
          class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
          placeholder="At least 6 characters"
        />
      </div>

      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
      >
        {{ loading ? 'Creating account...' : 'Create Account' }}
      </button>
    </form>
  </div>
</template>
