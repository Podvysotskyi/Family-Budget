// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@pinia/nuxt',
    '@nuxt/ui'
  ],

  components: [
    {
      path: '~/app/components',
      pathPrefix: false
    }
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    apiBase: process.env.NUXT_API_BASE || process.env.API_BASE || 'http://127.0.0.1:3001',
    googleClientId: process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.NUXT_OAUTH_GOOGLE_CLIENT_SECRET || '',
    googleOAuthCallbackUrl: process.env.GOOGLE_OAUTH_CALLBACK_URL || 'http://127.0.0.1:3000/auth/google/callback',
    internalApiSecret: process.env.INTERNAL_API_SECRET || process.env.SESSION_SECRET || process.env.NUXT_SESSION_PASSWORD || '',
    sessionSecret: process.env.SESSION_SECRET || process.env.NUXT_SESSION_PASSWORD || 'replace-with-at-least-32-characters',
    public: {}
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
