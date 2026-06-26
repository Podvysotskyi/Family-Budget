export function useApiFetch<T>(path: string | (() => string), options = {}) {
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined

  return useFetch<T>(path, {
    baseURL: '/api',
    credentials: 'include',
    headers,
    ...options
  })
}
