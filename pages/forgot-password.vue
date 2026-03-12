<script setup lang="ts">
const email = ref('')
const submitted = ref(false)
const loading = ref(false)

async function handleSubmit() {
  loading.value = true
  try {
    await $fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: email.value },
    })
  } catch {
    // Intentionally swallow errors — always show success to prevent enumeration
  } finally {
    submitted.value = true
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm py-12">
    <h1 class="text-2xl font-bold text-gray-900">Forgot Password</h1>

    <div v-if="submitted" class="mt-6 rounded-md bg-green-50 p-4 text-sm text-green-700">
      If that email is registered, you'll receive a password reset link shortly.
    </div>

    <template v-else>
      <p class="mt-2 text-sm text-gray-600">
        Enter your email address and we'll send you a link to reset your password.
      </p>

      <form class="mt-6 space-y-4" @submit.prevent="handleSubmit">
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

        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
        >
          {{ loading ? 'Sending...' : 'Send Reset Link' }}
        </button>
      </form>
    </template>

    <p class="mt-6 text-center text-sm text-gray-600">
      <NuxtLink to="/login" class="text-primary-600 hover:text-primary-700">Back to login</NuxtLink>
    </p>
  </div>
</template>
