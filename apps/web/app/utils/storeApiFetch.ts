export function storeApiFetch<T>(path: string, options: Parameters<typeof $fetch<T>>[1] = {}) {
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined

  return $fetch<T>(path, {
    baseURL: '/api',
    credentials: 'include',
    headers,
    ...options
  })
}
