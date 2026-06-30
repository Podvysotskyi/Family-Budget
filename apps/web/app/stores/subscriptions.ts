import type { CancelSubscriptionInput, SaveSubscriptionInput, Subscription } from '~/types/subscriptions'

const { createAbortController } = useAbortController()
const { addErrorToast } = useAppToast()
const { get, patch, post } = useStoreApi()

export const useSubscriptionsStore = defineStore('subscriptions', {
  state: () => ({
    abortController: null as AbortController | null,
    householdSubscriptions: [] as Subscription[],
    loading: false,
    userSubscriptions: {} as Record<string, Subscription[]>
  }),

  getters: {
    householdSubscriptionList: state => state.householdSubscriptions,

    userSubscriptionList: state => (userId: string) => {
      return state.userSubscriptions[userId] || []
    },

    hasHouseholdSubscriptions: state => state.householdSubscriptions.length > 0,

    hasUserSubscriptions: state => (userId: string) => {
      return Boolean(state.userSubscriptions[userId]?.length)
    },

    isLoading: state => state.loading
  },

  actions: {
    async fetchHouseholdSubscriptions(householdId: string) {
      if (!householdId) {
        return
      }

      const abortController = createAbortController(this)
      this.loading = true
      this.householdSubscriptions = []

      try {
        const response = await get<{
          subscriptions: Subscription[]
        }>(`/households/${householdId}/subscriptions`, {
          signal: abortController.signal
        })

        this.householdSubscriptions = response.subscriptions
        this.abortController = null
      } catch {
        if (!abortController.signal.aborted) {
          addErrorToast('Subscriptions could not be loaded')
        }
      } finally {
        if (!abortController.signal.aborted) {
          this.loading = false
        }
      }
    },

    async fetchUserSubscriptions(userId: string) {
      if (!userId) {
        return
      }

      const abortController = createAbortController(this)
      this.loading = true
      this.userSubscriptions[userId] = []

      try {
        const response = await get<{
          subscriptions: Subscription[]
        }>(`/users/${userId}/subscriptions`, {
          signal: abortController.signal
        })

        this.userSubscriptions[userId] = response.subscriptions
        this.abortController = null
      } catch {
        if (!abortController.signal.aborted) {
          addErrorToast('Subscriptions could not be loaded')
        }
      } finally {
        if (!abortController.signal.aborted) {
          this.loading = false
        }
      }
    },

    async createHouseholdSubscription(householdId: string, input: SaveSubscriptionInput) {
      await post(`/households/${householdId}/subscriptions`, input)
    },

    async createUserSubscription(userId: string, input: SaveSubscriptionInput) {
      await post(`/users/${userId}/subscriptions`, input)
    },

    async updateSubscription(subscriptionId: string, input: SaveSubscriptionInput) {
      await patch(`/subscriptions/${subscriptionId}`, input)
    },

    async cancelSubscription(subscriptionId: string, input: CancelSubscriptionInput) {
      await patch(`/subscriptions/${subscriptionId}/cancel`, input)
    }
  }
})
