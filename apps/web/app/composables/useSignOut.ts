export function useSignOut() {
  return async () => {
    const authStore = useAuthStore()

    await authStore.signOut()

    clearNuxtData()

    await navigateTo('/login')
  }
}
