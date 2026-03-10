interface User {
  id: number
  email: string
  name: string
}

interface AuthState {
  user: User | null
  token: string | null
}

const authState = reactive<AuthState>({
  user: null,
  token: null,
})

export function useAuth() {
  const isAuthenticated = computed(() => !!authState.user)

  async function fetchUser() {
    try {
      const data = await $fetch('/api/auth/me')
      authState.user = data.user
      return data.user
    } catch {
      authState.user = null
      authState.token = null
      return null
    }
  }

  async function login(email: string, password: string) {
    const data = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    authState.user = data.user
    authState.token = data.token
    return data
  }

  async function register(email: string, name: string, password: string) {
    const data = await $fetch('/api/auth/register', {
      method: 'POST',
      body: { email, name, password },
    })
    authState.user = data.user
    authState.token = data.token
    return data
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    authState.user = null
    authState.token = null
    navigateTo('/login')
  }

  return {
    user: computed(() => authState.user),
    isAuthenticated,
    login,
    register,
    logout,
    fetchUser,
  }
}
