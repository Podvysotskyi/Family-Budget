import { createError, defineEventHandler, getQuery, getRequestURL, sendRedirect, type H3Event } from 'h3'
import { getApiBase, getInternalApiSecret } from '../../../utils/api'
import { consumeOAuthState, setSessionUser, type SessionUser } from '../../../utils/session'

type GoogleTokenResponse = {
  access_token: string
}

type GoogleUserInfo = {
  sub: string
  email: string
  name?: string
  picture?: string
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  if (query.error) {
    return sendRedirect(event, '/login?error=oauth')
  }

  const code = typeof query.code === 'string' ? query.code : null
  const state = typeof query.state === 'string' ? query.state : null
  const expectedState = consumeOAuthState(event)

  if (!code || !state || !expectedState || state !== expectedState) {
    return sendRedirect(event, '/login?error=oauth')
  }

  try {
    const googleUser = await getGoogleUser(event, code)
    const { user } = await $fetch<{ user: SessionUser }>(`${getApiBase(event)}/internal/auth/google`, {
      method: 'POST',
      headers: {
        'x-family-budget-internal-secret': getInternalApiSecret(event)
      },
      body: {
        email: googleUser.email,
        googleId: googleUser.sub,
        name: googleUser.name,
        avatarUrl: googleUser.picture
      }
    })

    setSessionUser(event, user)

    return sendRedirect(event, '/dashboard')
  } catch {
    return sendRedirect(event, '/login?error=oauth')
  }
})

async function getGoogleUser(event: H3Event, code: string) {
  const config = useRuntimeConfig(event)
  const token = await $fetch<GoogleTokenResponse>('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      code,
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      redirect_uri: getGoogleCallbackUrl(event),
      grant_type: 'authorization_code'
    })
  })

  const user = await $fetch<GoogleUserInfo>('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      authorization: `Bearer ${token.access_token}`
    }
  })

  if (!user.sub || !user.email) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Google account did not return a usable profile'
    })
  }

  return user
}

function getGoogleCallbackUrl(event: H3Event) {
  const config = useRuntimeConfig(event)

  if (config.googleOAuthCallbackUrl) {
    return config.googleOAuthCallbackUrl
  }

  return `${getRequestURL(event).origin}/auth/google/callback`
}
