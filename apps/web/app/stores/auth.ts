import type { AuthUser } from '~/types/auth'

const sessionRequests = new WeakMap<object, Promise<boolean>>()
const { get, post } = useStoreApi()

export const useAuthStore = defineStore('auth', {
  state: () => ({
    error: null as string | null,
    isAuthenticated: null as boolean | null,
    isLoading: false,
    user: null as AuthUser | null
  }),

  actions: {
    async checkSession(options: { force?: boolean } = {}) {
      const sessionRequest = sessionRequests.get(this)

      if (sessionRequest && !options.force) {
        return sessionRequest
      }

      if (this.isAuthenticated !== null && !options.force) {
        return this.isAuthenticated
      }

      this.isLoading = true
      this.error = null

      const request = get<{
        user: AuthUser
      }>('/auth/me')
        .then((response) => {
          this.user = response.user
          this.isAuthenticated = true

          return true
        })
        .catch(() => {
          this.error = 'Session check failed'
          this.user = null
          this.isAuthenticated = false

          return false
        })
        .finally(() => {
          this.isLoading = false
          sessionRequests.delete(this)
        })

      sessionRequests.set(this, request)

      return request
    },

    reset() {
      this.error = null
      this.isAuthenticated = false
      this.user = null
      sessionRequests.delete(this)
    },

    async signOut() {
      await post('/auth/logout').catch(() => undefined)

      this.reset()
    }
  }
})
