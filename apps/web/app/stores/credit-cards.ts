import type { CancelCreditCardInput, CreditCard, SaveCreditCardInput, UpdateCreditCardBalanceInput } from '~/types/credit-cards'

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

    async createHouseholdCreditCard(householdId: string, input: SaveCreditCardInput) {
      await storeApiFetch(`/households/${householdId}/credit-cards`, {
        method: 'POST',
        body: input
      })
    },

    async createUserCreditCard(userId: string, input: SaveCreditCardInput) {
      await storeApiFetch(`/users/${userId}/credit-cards`, {
        method: 'POST',
        body: input
      })
    },

    async updateCreditCard(creditCardId: string, input: SaveCreditCardInput) {
      await storeApiFetch(`/credit-cards/${creditCardId}`, {
        method: 'PATCH',
        body: input
      })
    },

    async cancelCreditCard(creditCardId: string, input: CancelCreditCardInput) {
      await storeApiFetch(`/credit-cards/${creditCardId}/cancel`, {
        method: 'PATCH',
        body: input
      })
    },

    async updateCreditCardBalance(creditCardId: string, input: UpdateCreditCardBalanceInput) {
      await storeApiFetch(`/credit-cards/${creditCardId}/balance`, {
        method: 'PATCH',
        body: input
      })
    }
  }
})
