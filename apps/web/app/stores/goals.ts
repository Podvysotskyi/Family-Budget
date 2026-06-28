import type { Goal, SaveGoalInput } from '~/types/goals'

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
        const response = await storeApiFetch<{
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
      await storeApiFetch(`/households/${householdId}/goals`, {
        method: 'POST',
        body: input
      })
      await this.fetchGoals(householdId)
    },

    async updateGoal(householdId: string, goalId: string, input: SaveGoalInput) {
      await storeApiFetch(`/households/${householdId}/goals/${goalId}`, {
        method: 'PATCH',
        body: input
      })
      await this.fetchGoals(householdId)
    },

    async deleteGoal(householdId: string, goalId: string) {
      await storeApiFetch(`/households/${householdId}/goals/${goalId}`, {
        method: 'DELETE'
      })
      await this.fetchGoals(householdId)
    },

    async permanentlyDeleteGoal(householdId: string, goalId: string) {
      await storeApiFetch(`/households/${householdId}/goals/${goalId}/permanent`, {
        method: 'DELETE'
      })
      await this.fetchGoals(householdId)
    }
  }
})
