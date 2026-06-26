import type { H3Event } from 'h3'

export function getApiBase(event: H3Event) {
  return withoutTrailingSlash(useRuntimeConfig(event).apiBase || 'http://127.0.0.1:3001')
}

export function getInternalApiSecret(event: H3Event) {
  const config = useRuntimeConfig(event)

  return config.internalApiSecret || config.sessionSecret || 'replace-with-at-least-32-characters'
}

function withoutTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value
}
