import type { CancelCreditCardInput, CreditCard, SaveCreditCardInput, UpdateCreditCardBalanceInput } from '~/types/credit-cards'

const { createAbortController } = useAbortController()
const { get, patch, post } = useStoreApi()

export const useCreditCardsStore = defineStore('creditCards', {
  state: () => ({
    abortController: null as AbortController | null,
    householdCreditCards: [] as CreditCard[],
    loading: false,
    userCreditCards: {} as Record<string, CreditCard[]>
  }),

  getters: {
    householdCreditCardList: state => state.householdCreditCards,

    userCreditCardList: state => (userId: string) => {
      return state.userCreditCards[userId] || []
    },

    hasHouseholdCreditCards: state => state.householdCreditCards.length > 0,

    hasUserCreditCards: state => (userId: string) => {
      return Boolean(state.userCreditCards[userId]?.length)
    },

    isLoading: state => state.loading
  },

  actions: {
    async fetchHouseholdCreditCards(householdId: string) {
      if (!householdId) {
        return
      }

      const abortController = createAbortController(this)
      this.loading = true

      this.householdCreditCards = []

      try {
        const response = await get<{
          creditCards: CreditCard[]
        }>(`/households/${householdId}/credit-cards`, {
          signal: abortController.signal
        })

        this.householdCreditCards = response.creditCards
        this.abortController = null
      } catch (error) {
        if (!abortController.signal.aborted) {
          useAppToast().addErrorToast('Credit cards could not be loaded')
        }
      } finally {
        if (!abortController.signal.aborted) {
          this.loading = false
        }
      }
    },

    async fetchUserCreditCards(userId: string) {
      if (!userId) {
        return
      }

      const abortController = createAbortController(this)
      this.loading = true

      this.userCreditCards[userId] = []

      try {
        const response = await get<{
          creditCards: CreditCard[]
        }>(`/users/${userId}/credit-cards`, {
          signal: abortController.signal
        })

        this.userCreditCards[userId] = response.creditCards
        this.abortController = null
      } catch (error) {
        if (!abortController.signal.aborted) {
          useAppToast().addErrorToast('Credit cards could not be loaded')
        }
      } finally {
        if (!abortController.signal.aborted) {
          this.loading = false
        }
      }
    },

    async createHouseholdCreditCard(householdId: string, input: SaveCreditCardInput) {
      await post(`/households/${householdId}/credit-cards`, input)
    },

    async createUserCreditCard(userId: string, input: SaveCreditCardInput) {
      await post(`/users/${userId}/credit-cards`, input)
    },

    async updateCreditCard(creditCardId: string, input: SaveCreditCardInput) {
      await patch(`/credit-cards/${creditCardId}`, input)
    },

    async cancelCreditCard(creditCardId: string, input: CancelCreditCardInput) {
      await patch(`/credit-cards/${creditCardId}/cancel`, input)
    },

    async updateCreditCardBalance(creditCardId: string, input: UpdateCreditCardBalanceInput) {
      await patch(`/credit-cards/${creditCardId}/balance`, input)
    }
  }
})
