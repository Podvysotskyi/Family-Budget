export interface CreditCardE2EContext {
  apiBase: string
  currentUser: {
    id: string
    email: string
    name: string
    avatarUrl: string | null
  }
  householdId: string
  internalSecret: string
  sessionSecret: string
}

declare module 'vitest' {
  export interface ProvidedContext {
    creditCardE2E: CreditCardE2EContext
  }
}
