export default defineNuxtRouteMiddleware(async () => {
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined

  try {
    await $fetch('/auth/me', {
      baseURL: '/api',
      credentials: 'include',
      headers
    })

    return navigateTo('/dashboard')
  } catch {
    return undefined
  }
})
