<script setup lang="ts">
const route = useRoute()
const token = computed(() => String(route.query.token ?? ''))

const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)
const success = ref(false)

async function handleSubmit() {
  error.value = ''

  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }

  loading.value = true
  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { token: token.value, newPassword: newPassword.value },
    })
    success.value = true
    setTimeout(() => navigateTo('/login'), 2000)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to reset password. The link may be invalid or expired.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm py-12">
    <h1 class="text-2xl font-bold text-gray-900">Reset Password</h1>

    <div v-if="success" class="mt-6 rounded-md bg-green-50 p-4 text-sm text-green-700">
      Password reset successfully! Redirecting to login...
    </div>

    <div v-else-if="!token" class="mt-6 rounded-md bg-red-50 p-4 text-sm text-red-700">
      Invalid reset link. Please request a new password reset.
    </div>

    <form v-else class="mt-6 space-y-4" @submit.prevent="handleSubmit">
      <div
        v-if="error"
        role="alert"
        aria-live="polite"
        class="rounded-md bg-red-50 p-3 text-sm text-red-700"
      >
        {{ error }}
      </div>

      <div>
        <label for="new-password" class="block text-sm font-medium text-gray-700">New Password</label>
        <input
          id="new-password"
          v-model="newPassword"
          type="password"
          required
          autocomplete="new-password"
          class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
          placeholder="At least 8 chars, 1 uppercase, 1 number"
        >
      </div>

      <div>
        <label for="confirm-password" class="block text-sm font-medium text-gray-700">Confirm Password</label>
        <input
          id="confirm-password"
          v-model="confirmPassword"
          type="password"
          required
          autocomplete="new-password"
          class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
          placeholder="Repeat your new password"
        >
      </div>

      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
      >
        {{ loading ? 'Resetting...' : 'Reset Password' }}
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-gray-600">
      <NuxtLink to="/login" class="text-primary-600 hover:text-primary-700">Back to login</NuxtLink>
    </p>
  </div>
</template>
