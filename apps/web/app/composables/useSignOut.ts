export function useSignOut() {
  return async () => {
    await $fetch('/auth/logout', {
      baseURL: '/api',
      method: 'POST',
      credentials: 'include'
    }).catch(() => undefined)

    clearNuxtData()

    await navigateTo('/login')
  }
}
