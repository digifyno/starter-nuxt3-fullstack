<script setup lang="ts">
const { login, isAuthenticated } = useAuth()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

if (isAuthenticated.value) {
  navigateTo('/tasks')
}

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await login(email.value, password.value)
    navigateTo('/tasks')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm py-12">
    <h1 class="text-2xl font-bold text-gray-900">Login</h1>
    <p class="mt-2 text-sm text-gray-600">
      Don't have an account?
      <NuxtLink to="/register" class="text-primary-600 hover:text-primary-700">Register</NuxtLink>
    </p>

    <form
      class="mt-6 space-y-4"
      :aria-describedby="error ? 'login-error' : undefined"
      @submit.prevent="handleLogin"
    >
      <div
        v-if="error"
        id="login-error"
        role="alert"
        aria-live="polite"
        class="rounded-md bg-red-50 p-3 text-sm text-red-700"
      >
        {{ error }}
      </div>

      <div>
        <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
          placeholder="you@example.com"
        >
      </div>

      <div>
        <div class="flex items-center justify-between">
          <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
          <NuxtLink to="/forgot-password" class="text-sm text-primary-600 hover:text-primary-700">
            Forgot password?
          </NuxtLink>
        </div>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
          placeholder="Your password"
        >
      </div>

      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
      >
        {{ loading ? 'Logging in...' : 'Login' }}
      </button>
    </form>

    <p v-if="$config.public.isDev" class="mt-6 text-center text-xs text-gray-500">
      Demo: demo@example.com / Password123
    </p>
  </div>
</template>
