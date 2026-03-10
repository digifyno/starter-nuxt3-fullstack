<script setup lang="ts">
const { isAuthenticated } = useAuth()
</script>

<template>
  <div class="py-12 text-center">
    <h1 class="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
      Nuxt 3 Fullstack Starter
    </h1>
    <p class="mt-4 text-lg text-gray-600">
      Build fullstack applications with Nuxt 3, Prisma, Tailwind CSS, and JWT authentication.
    </p>
    <div class="mt-8 flex justify-center gap-4">
      <NuxtLink
        v-if="isAuthenticated"
        to="/tasks"
        class="rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
      >
        Go to Tasks
      </NuxtLink>
      <template v-else>
        <NuxtLink
          to="/register"
          class="rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
        >
          Get Started
        </NuxtLink>
        <NuxtLink
          to="/login"
          class="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Login
        </NuxtLink>
      </template>
    </div>

    <div class="mt-16 grid gap-6 sm:grid-cols-3">
      <div class="rounded-xl border border-gray-200 bg-white p-6 text-left">
        <h3 class="font-semibold text-gray-900">Server-Side Rendering</h3>
        <p class="mt-2 text-sm text-gray-600">
          Nuxt 3 provides hybrid rendering with SSR, SSG, and client-side navigation out of the box.
        </p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-6 text-left">
        <h3 class="font-semibold text-gray-900">Database with Prisma</h3>
        <p class="mt-2 text-sm text-gray-600">
          Type-safe database access with Prisma ORM. SQLite for development, easily swap to PostgreSQL.
        </p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-6 text-left">
        <h3 class="font-semibold text-gray-900">JWT Authentication</h3>
        <p class="mt-2 text-sm text-gray-600">
          Secure authentication with JWT tokens, password hashing, and route middleware protection.
        </p>
      </div>
    </div>
  </div>
</template>
