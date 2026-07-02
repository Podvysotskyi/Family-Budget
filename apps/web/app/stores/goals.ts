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

    async createHouseholdGoal(householdId: string, input: SaveGoalInput) {
      await post(`/households/${householdId}/goals`, input)
    },

    async updateGoal(goal: Goal, input: SaveGoalInput) {
      await patch(`/households/${goal.householdId}/goals/${goal.id}`, input)
    },

    async closeGoal(goal: Goal) {
      await deleteRequest(`/households/${goal.householdId}/goals/${goal.id}`)
    }
  }
})
