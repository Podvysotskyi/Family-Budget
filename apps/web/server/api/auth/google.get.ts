import { createError, defineEventHandler, getRequestURL, sendRedirect, type H3Event } from 'h3'
import { createOAuthState } from '../../utils/session'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const clientId = config.googleClientId

  if (!clientId) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Google OAuth client ID is not configured'
    })
  }

  const callbackUrl = getGoogleCallbackUrl(event)
  const state = createOAuthState(event)
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state
  })

  return sendRedirect(event, `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
})

function getGoogleCallbackUrl(event: H3Event) {
  const config = useRuntimeConfig(event)

  if (config.googleOAuthCallbackUrl) {
    return config.googleOAuthCallbackUrl
  }

  return `${getRequestURL(event).origin}/auth/google/callback`
}
