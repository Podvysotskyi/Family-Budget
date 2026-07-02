import type { Goal, SaveGoalInput } from '~/types/goals'

const { createAbortController } = useAbortController()
const { addErrorToast } = useAppToast()
const { delete: deleteRequest, get, patch, post } = useStoreApi()

export const useGoalsStore = defineStore('goals', {
  state: () => ({
    abortController: null as AbortController | null,
    householdGoals: [] as Goal[],
    loading: false
  }),

  getters: {
    householdGoalList: state => state.householdGoals,

    hasHouseholdGoals: state => state.householdGoals.length > 0,

    isLoading: state => state.loading
  },

  actions: {
    async fetchHouseholdGoals(householdId: string) {
      if (!householdId) {
        return
      }

      const abortController = createAbortController(this)
      this.loading = true
      this.householdGoals = []

      try {
        const response = await get<{
          goals: Goal[]
        }>(`/households/${householdId}/goals`, {
          signal: abortController.signal
        })

        this.householdGoals = response.goals
        this.abortController = null
      } catch {
        if (!abortController.signal.aborted) {
          addErrorToast('Goals could not be loaded')
        }
      } finally {
        if (!abortController.signal.aborted) {
          this.loading = false
        }
      }
    },

    async createGoal(householdId: string, input: SaveGoalInput) {
      await post(`/households/${householdId}/goals`, input)
    },

    async updateGoal(householdId: string, goalId: string, input: SaveGoalInput) {
      await patch(`/households/${householdId}/goals/${goalId}`, input)
    },

    async closeGoal(householdId: string, goalId: string) {
      await deleteRequest(`/households/${householdId}/goals/${goalId}`)
    },

    async permanentlyDeleteGoal(householdId: string, goalId: string) {
      await deleteRequest(`/households/${householdId}/goals/${goalId}/permanent`)
    }
  }
})
