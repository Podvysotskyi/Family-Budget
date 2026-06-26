import { UnauthorizedException } from '@nestjs/common'
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface'
import type { RequestUser } from './interfaces/request-user.interface'

const userHeaderName = 'x-family-budget-user'
const internalSecretHeaderName = 'x-family-budget-internal-secret'

export type { AuthenticatedRequest } from './interfaces/authenticated-request.interface'
export type { RequestUser } from './interfaces/request-user.interface'

export function requireRequestUser(request: AuthenticatedRequest) {
  if (!isInternalRequest(request)) {
    throw new UnauthorizedException('Unauthorized')
  }

  const rawUser = request.headers[userHeaderName]
  const encodedUser = Array.isArray(rawUser) ? rawUser[0] : rawUser

  if (!encodedUser) {
    throw new UnauthorizedException('Unauthorized')
  }

  try {
    return JSON.parse(Buffer.from(encodedUser, 'base64url').toString('utf8')) as RequestUser
  } catch {
    throw new UnauthorizedException('Unauthorized')
  }
}

function isInternalRequest(request: AuthenticatedRequest) {
  const rawSecret = request.headers[internalSecretHeaderName]
  const internalSecret = Array.isArray(rawSecret) ? rawSecret[0] : rawSecret

  return Boolean(internalSecret && internalSecret === getInternalApiSecret())
}

function getInternalApiSecret() {
  return process.env.INTERNAL_API_SECRET
    || process.env.SESSION_SECRET
    || process.env.NUXT_SESSION_PASSWORD
    || 'replace-with-at-least-32-characters'
}
