interface User {
  id: number
  email: string
  name: string
}

interface AuthState {
  user: User | null
}

function extractErrorMessage(e: unknown, fallback: string): string {
  if (e && typeof e === 'object') {
    const err = e as Record<string, unknown>
    // Nuxt $fetch wraps server errors: err.data contains the JSON body
    if (err.data && typeof err.data === 'object') {
      const d = err.data as Record<string, unknown>
      if (typeof d.message === 'string') return d.message
      if (typeof d.statusMessage === 'string') return d.statusMessage
    }
    if (typeof err.message === 'string') return err.message
    if (typeof err.statusMessage === 'string') return err.statusMessage
  }
  return fallback
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
    try {
      const data = await $fetch('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      authState.value.user = data.user
      return data
    } catch (e: unknown) {
      throw new Error(extractErrorMessage(e, 'Login failed'))
    }
  }

  async function register(email: string, name: string, password: string) {
    try {
      const data = await $fetch('/api/auth/register', {
        method: 'POST',
        body: { email, name, password },
      })
      authState.value.user = data.user
      return data
    } catch (e: unknown) {
      throw new Error(extractErrorMessage(e, 'Registration failed'))
    }
  }

  async function logout() {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore logout errors; proceed to clear local state
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
