interface User {
  id: number
  email: string
  name: string
}

interface AuthState {
  user: User | null
}

export function useAuth() {
  const authState = useState<AuthState>('auth', () => ({ user: null }))

  const isAuthenticated = computed(() => !!authState.value.user)

  async function fetchUser() {
    try {
      const data = await $fetch('/api/auth/me')
      authState.value.user = data.user
      return data.user
    } catch {
      authState.value.user = null
      return null
    }
  }

  async function login(email: string, password: string) {
    const data = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    authState.value.user = data.user
    return data
  }

  async function register(email: string, name: string, password: string) {
    const data = await $fetch('/api/auth/register', {
      method: 'POST',
      body: { email, name, password },
    })
    authState.value.user = data.user
    return data
  }

  async function logout() {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      authState.value.user = null
      navigateTo('/login')
    }
  }

  return {
    user: computed(() => authState.value.user),
    isAuthenticated,
    login,
    register,
    logout,
    fetchUser,
  }
}
