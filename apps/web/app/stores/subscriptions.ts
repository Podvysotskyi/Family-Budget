import type { SaveSubscriptionInput, Subscription } from '~/types/subscriptions'

const { get, patch, post } = useStoreApi()

export const useSubscriptionsStore = defineStore('subscriptions', {
  state: () => ({
    errorsByHouseholdId: {} as Record<string, string | null>,
    loadingByHouseholdId: {} as Record<string, boolean>,
    subscriptionsByHouseholdId: {} as Record<string, Subscription[]>
  }),

  actions: {
    getError(householdId: string) {
      return this.errorsByHouseholdId[householdId] || null
    },

    getSubscriptions(householdId: string) {
      return this.subscriptionsByHouseholdId[householdId] || []
    },

    isLoading(householdId: string) {
      return this.loadingByHouseholdId[householdId] || false
    },

    async fetchSubscriptions(householdId: string) {
      if (!householdId) {
        return
      }

      this.loadingByHouseholdId[householdId] = true
      this.errorsByHouseholdId[householdId] = null

      try {
        const response = await get<{
          subscriptions: Subscription[]
        }>(`/households/${householdId}/subscriptions`)

        this.subscriptionsByHouseholdId[householdId] = response.subscriptions
      } catch {
        this.errorsByHouseholdId[householdId] = 'Subscriptions could not be loaded'
      } finally {
        this.loadingByHouseholdId[householdId] = false
      }
    },

    async createSubscription(householdId: string, input: SaveSubscriptionInput) {
      await post(`/households/${householdId}/subscriptions`, input)
      await this.fetchSubscriptions(householdId)
    },

    async updateSubscription(householdId: string, subscriptionId: string, input: SaveSubscriptionInput) {
      await patch(`/households/${householdId}/subscriptions/${subscriptionId}`, input)
      await this.fetchSubscriptions(householdId)
    },

  }
})
