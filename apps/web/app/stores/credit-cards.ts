export type CreditCardLimit = {
  id: string
  date: string
  limit: number
}

export type CreditCard = {
  id: string
  householdId: string
  name: string
  userId: string | null
  user: {
    userId: string
    name?: string | null
    email: string
    avatarUrl?: string | null
  } | null
  startDate: string
  endDate: string | null
  dueDate: string
  currentLimit: number | null
  limits: CreditCardLimit[]
  createdAt: string
  updatedAt: string
}

export type SaveCreditCardInput = {
  name: string
  userId: string | null
  startDate: string
  endDate: string | null
  dueDate: string
  limit: number
  limitEffectiveDate: string
}

export const useCreditCardsStore = defineStore('creditCards', {
  state: () => ({
    creditCardsByHouseholdId: {} as Record<string, CreditCard[]>,
    errorsByHouseholdId: {} as Record<string, string | null>,
    loadingByHouseholdId: {} as Record<string, boolean>
  }),

  actions: {
    getCreditCards(householdId: string) {
      return this.creditCardsByHouseholdId[householdId] || []
    },

    getError(householdId: string) {
      return this.errorsByHouseholdId[householdId] || null
    },

    isLoading(householdId: string) {
      return this.loadingByHouseholdId[householdId] || false
    },

    async fetchCreditCards(householdId: string) {
      if (!householdId) {
        return
      }

      this.loadingByHouseholdId[householdId] = true
      this.errorsByHouseholdId[householdId] = null

      try {
        const response = await storeApiFetch<{
          creditCards: CreditCard[]
        }>(`/households/${householdId}/credit-cards`)

        this.creditCardsByHouseholdId[householdId] = response.creditCards
      } catch {
        this.errorsByHouseholdId[householdId] = 'Credit cards could not be loaded'
      } finally {
        this.loadingByHouseholdId[householdId] = false
      }
    },

    async createCreditCard(householdId: string, input: SaveCreditCardInput) {
      await storeApiFetch(`/households/${householdId}/credit-cards`, {
        method: 'POST',
        body: input
      })
      await this.fetchCreditCards(householdId)
    },

    async updateCreditCard(householdId: string, creditCardId: string, input: SaveCreditCardInput) {
      await storeApiFetch(`/households/${householdId}/credit-cards/${creditCardId}`, {
        method: 'PATCH',
        body: input
      })
      await this.fetchCreditCards(householdId)
    },

    async deleteCreditCard(householdId: string, creditCardId: string) {
      await storeApiFetch(`/households/${householdId}/credit-cards/${creditCardId}`, {
        method: 'DELETE'
      })
      await this.fetchCreditCards(householdId)
    }
  }
})
