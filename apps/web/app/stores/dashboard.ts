import type { DashboardShell } from '~/types/dashboard'

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    data: null as DashboardShell | null,
    error: null as string | null,
    isLoaded: false,
    isLoading: false
  }),

  getters: {
    user: state => state.data?.user || null,
    household: state => state.data?.household || null,
    members: state => state.data?.members || [],
    householdId: state => state.data?.household?.householdId || '',
    householdName: state => state.data?.household?.householdName || '',
    defaultBudgetUserId: (state) => {
      return state.data?.members.find(member => member.userId === state.data?.user.id)?.userId
        || state.data?.members[0]?.userId
        || state.data?.user.id
        || ''
    }
  },

  actions: {
    async fetchDashboard(options: { force?: boolean } = {}) {
      if (this.isLoading) {
        return
      }

      if (this.isLoaded && !options.force) {
        return
      }

      this.isLoading = true
      this.error = null

      try {
        this.data = await storeApiFetch<DashboardShell>('/dashboard')
        this.isLoaded = true
      } catch {
        this.error = 'Dashboard could not be loaded'
      } finally {
        this.isLoading = false
      }
    },

    async updateHouseholdName(name: string) {
      if (!this.householdId) {
        throw new Error('Household is required')
      }

      const response = await storeApiFetch<{
        household: {
          householdId: string
          householdName: string
        }
      }>(`/households/${this.householdId}`, {
        method: 'PATCH',
        body: {
          name
        }
      })

      if (this.data?.household) {
        this.data.household.householdName = response.household.householdName
      }

      return response.household
    }
  }
})
