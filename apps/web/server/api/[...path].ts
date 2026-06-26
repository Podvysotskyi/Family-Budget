import { defineEventHandler, getMethod, getRequestURL, readRawBody, setHeader, setResponseStatus } from 'h3'
import { getApiBase, getInternalApiSecret } from '../utils/api'
import { encodeUserHeader, requireSessionUser } from '../utils/session'

export default defineEventHandler(async (event) => {
  const user = requireSessionUser(event)
  const path = getProxyPath(event.context.params?.path)
  const target = `${getApiBase(event)}/${path}${getRequestURL(event).search}`
  const method = getMethod(event)
  const body = method === 'GET' || method === 'HEAD'
    ? undefined
    : await readRawBody(event)

  const response = await $fetch.raw(target, {
    method,
    body,
    headers: {
      'content-type': event.headers.get('content-type') || 'application/json',
      'x-family-budget-internal-secret': getInternalApiSecret(event),
      'x-family-budget-user': encodeUserHeader(user)
    },
    ignoreResponseError: true
  })

  setResponseStatus(event, response.status)

  const contentType = response.headers.get('content-type')
  if (contentType) {
    setHeader(event, 'content-type', contentType)
  }

  return response._data
})

function getProxyPath(path: string | string[] | undefined) {
  if (Array.isArray(path)) {
    return path.join('/')
  }

  return path || ''
}
