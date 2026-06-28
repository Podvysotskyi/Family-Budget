import type { CancelCreditCardInput, CreditCard, SaveCreditCardBalanceInput, SaveCreditCardInput } from '~/types/credit-cards'

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

    async cancelCreditCard(householdId: string, creditCardId: string, input: CancelCreditCardInput) {
      await storeApiFetch(`/households/${householdId}/credit-cards/${creditCardId}/cancel`, {
        method: 'PATCH',
        body: input
      })
      await this.fetchCreditCards(householdId)
    },

    async saveCreditCardBalance(householdId: string, creditCardId: string, input: SaveCreditCardBalanceInput) {
      await storeApiFetch(`/households/${householdId}/credit-cards/${creditCardId}/balance`, {
        method: 'PATCH',
        body: input
      })
      await this.fetchCreditCards(householdId)
    }
  }
})
