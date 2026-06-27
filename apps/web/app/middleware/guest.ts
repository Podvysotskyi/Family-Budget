export default defineNuxtRouteMiddleware(async () => {
  const authStore = useAuthStore()
  const isAuthenticated = await authStore.checkSession()

  if (isAuthenticated) {
    return navigateTo('/dashboard')
  }
})
