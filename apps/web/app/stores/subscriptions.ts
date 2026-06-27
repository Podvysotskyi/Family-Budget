export type SubscriptionType = 'monthly' | 'yearly'

export type Subscription = {
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
  type: SubscriptionType
  startDate: string
  endDate: string | null
  amount: number
  autopay: boolean
  createdAt: string
  updatedAt: string
}

export type SaveSubscriptionInput = {
  name: string
  userId: string | null
  type: SubscriptionType
  startDate: string
  endDate: string | null
  amount: number
  autopay: boolean
}

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
        const response = await storeApiFetch<{
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
      await storeApiFetch(`/households/${householdId}/subscriptions`, {
        method: 'POST',
        body: input
      })
      await this.fetchSubscriptions(householdId)
    },

    async updateSubscription(householdId: string, subscriptionId: string, input: SaveSubscriptionInput) {
      await storeApiFetch(`/households/${householdId}/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        body: input
      })
      await this.fetchSubscriptions(householdId)
    },

    async deleteSubscription(householdId: string, subscriptionId: string) {
      await storeApiFetch(`/households/${householdId}/subscriptions/${subscriptionId}`, {
        method: 'DELETE'
      })
      await this.fetchSubscriptions(householdId)
    }
  }
})
