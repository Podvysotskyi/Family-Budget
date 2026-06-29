import type { Goal, SaveGoalInput } from '~/types/goals'

const { delete: deleteRequest, get, patch, post } = useStoreApi()

export const useGoalsStore = defineStore('goals', {
  state: () => ({
    errorsByHouseholdId: {} as Record<string, string | null>,
    goalsByHouseholdId: {} as Record<string, Goal[]>,
    loadingByHouseholdId: {} as Record<string, boolean>
  }),

  actions: {
    getGoals(householdId: string) {
      return this.goalsByHouseholdId[householdId] || []
    },

    getError(householdId: string) {
      return this.errorsByHouseholdId[householdId] || null
    },

    isLoading(householdId: string) {
      return this.loadingByHouseholdId[householdId] || false
    },

    async fetchGoals(householdId: string) {
      if (!householdId) {
        return
      }

      this.loadingByHouseholdId[householdId] = true
      this.errorsByHouseholdId[householdId] = null

      try {
        const response = await get<{
          goals: Goal[]
        }>(`/households/${householdId}/goals`)

        this.goalsByHouseholdId[householdId] = response.goals
      } catch {
        this.errorsByHouseholdId[householdId] = 'Goals could not be loaded'
      } finally {
        this.loadingByHouseholdId[householdId] = false
      }
    },

    async createGoal(householdId: string, input: SaveGoalInput) {
      await post(`/households/${householdId}/goals`, input)
      await this.fetchGoals(householdId)
    },

    async updateGoal(householdId: string, goalId: string, input: SaveGoalInput) {
      await patch(`/households/${householdId}/goals/${goalId}`, input)
      await this.fetchGoals(householdId)
    },

    async deleteGoal(householdId: string, goalId: string) {
      await deleteRequest(`/households/${householdId}/goals/${goalId}`)
      await this.fetchGoals(householdId)
    },

    async permanentlyDeleteGoal(householdId: string, goalId: string) {
      await deleteRequest(`/households/${householdId}/goals/${goalId}/permanent`)
      await this.fetchGoals(householdId)
    }
  }
})
