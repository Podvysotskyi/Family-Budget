import { createError, deleteCookie, getCookie, setCookie, type H3Event } from 'h3'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const sessionCookieName = 'family-budget.session'
const oauthStateCookieName = 'family-budget.oauth-state'

export interface SessionUser {
  id: string
  email: string
  name?: string | null
  avatarUrl?: string | null
}

export function createOAuthState(event: H3Event) {
  const state = randomBytes(32).toString('base64url')

  setCookie(event, oauthStateCookieName, state, {
    httpOnly: true,
    maxAge: 10 * 60,
    path: '/',
    sameSite: 'lax',
    secure: isSecureCookie()
  })

  return state
}

export function consumeOAuthState(event: H3Event) {
  const state = getCookie(event, oauthStateCookieName)
  deleteCookie(event, oauthStateCookieName, {
    path: '/'
  })

  return state || null
}

export function getSessionUser(event: H3Event) {
  const value = getCookie(event, sessionCookieName)

  if (!value) {
    return null
  }

  const [payload, signature] = value.split('.')

  if (!payload || !signature || !isValidSignature(payload, signature, getSessionSecret(event))) {
    clearSessionUser(event)
    return null
  }

  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionUser
  } catch {
    clearSessionUser(event)
    return null
  }
}

export function requireSessionUser(event: H3Event) {
  const user = getSessionUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  return user
}

export function setSessionUser(event: H3Event, user: SessionUser) {
  const payload = Buffer.from(JSON.stringify(user), 'utf8').toString('base64url')
  const signature = sign(payload, getSessionSecret(event))

  setCookie(event, sessionCookieName, `${payload}.${signature}`, {
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
    sameSite: 'lax',
    secure: isSecureCookie()
  })
}

export function clearSessionUser(event: H3Event) {
  deleteCookie(event, sessionCookieName, {
    path: '/'
  })
}

export function encodeUserHeader(user: SessionUser) {
  return Buffer.from(JSON.stringify(user), 'utf8').toString('base64url')
}

function getSessionSecret(event: H3Event) {
  const config = useRuntimeConfig(event)

  return config.sessionSecret || 'replace-with-at-least-32-characters'
}

function sign(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function isValidSignature(payload: string, signature: string, secret: string) {
  const expected = sign(payload, secret)
  const expectedBuffer = Buffer.from(expected)
  const signatureBuffer = Buffer.from(signature)

  return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer)
}

function isSecureCookie() {
  return process.env.NODE_ENV === 'production'
}
