type StoreApiOptions<T> = Omit<NonNullable<Parameters<typeof $fetch<T>>[1]>, 'body' | 'method'>
type StoreApiRequestBody = NonNullable<Parameters<typeof $fetch<unknown>>[1]>['body']

export function useStoreApi() {
  function request<T>(path: string, options: Parameters<typeof $fetch<T>>[1] = {}) {
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined

    return $fetch<T>(path, {
      baseURL: '/api',
      credentials: 'include',
      headers,
      ...options
    })
  }

  function get<T>(path: string, options: StoreApiOptions<T> = {}) {
    return request<T>(path, {
      ...options,
      method: 'GET'
    })
  }

  function post<T>(path: string, body?: StoreApiRequestBody, options: StoreApiOptions<T> = {}) {
    return request<T>(path, {
      ...options,
      method: 'POST',
      body
    })
  }

  function patch<T>(path: string, body?: StoreApiRequestBody, options: StoreApiOptions<T> = {}) {
    return request<T>(path, {
      ...options,
      method: 'PATCH',
      body
    })
  }

  function deleteRequest<T>(path: string, options: StoreApiOptions<T> = {}) {
    return request<T>(path, {
      ...options,
      method: 'DELETE'
    })
  }

  return {
    delete: deleteRequest,
    get,
    patch,
    post,
    request
  }
}
