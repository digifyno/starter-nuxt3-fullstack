<script setup lang="ts">
const { isAuthenticated, user, logout } = useAuth()
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-white px-4 py-2 z-50 rounded-md text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
    >
      Skip to main content
    </a>
    <header class="bg-white border-b border-gray-200">
      <nav aria-label="Main navigation" class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-14 items-center justify-between">
          <NuxtLink to="/" class="text-lg font-semibold text-gray-900">
            Nuxt Fullstack
          </NuxtLink>
          <div class="flex items-center gap-4">
            <template v-if="isAuthenticated">
              <NuxtLink
                to="/tasks"
                class="text-sm text-gray-600 hover:text-gray-900"
              >
                Tasks
              </NuxtLink>
              <span class="text-sm text-gray-500">{{ user?.name }}</span>
              <button
                type="button"
                class="text-sm text-gray-500 hover:text-gray-700"
                @click="logout"
              >
                Logout
              </button>
            </template>
            <template v-else>
              <NuxtLink
                to="/login"
                class="text-sm text-gray-600 hover:text-gray-900"
              >
                Login
              </NuxtLink>
              <NuxtLink
                to="/register"
                class="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
              >
                Register
              </NuxtLink>
            </template>
          </div>
        </div>
      </nav>
    </header>
    <main id="main-content" class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <slot />
    </main>
  </div>
</template>
