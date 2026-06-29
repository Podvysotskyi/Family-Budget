import type { BudgetCategory } from '~/types/budget-categories'

const { delete: deleteRequest, get, patch, post } = useStoreApi()

export const useBudgetCategoriesStore = defineStore('budgetCategories', {
  state: () => ({
    categoriesByHouseholdId: {} as Record<string, BudgetCategory[]>,
    errorsByHouseholdId: {} as Record<string, string | null>,
    loadingByHouseholdId: {} as Record<string, boolean>
  }),

  actions: {
    getCategories(householdId: string) {
      return this.categoriesByHouseholdId[householdId] || []
    },

    isLoading(householdId: string) {
      return this.loadingByHouseholdId[householdId] || false
    },

    getError(householdId: string) {
      return this.errorsByHouseholdId[householdId] || null
    },

    async fetchCategories(householdId: string) {
      if (!householdId) {
        return
      }

      this.loadingByHouseholdId[householdId] = true
      this.errorsByHouseholdId[householdId] = null

      try {
        const response = await get<{
          categories: BudgetCategory[]
        }>(`/households/${householdId}/budget-categories`)

        this.categoriesByHouseholdId[householdId] = response.categories
      } catch {
        this.errorsByHouseholdId[householdId] = 'Budget categories could not be loaded'
      } finally {
        this.loadingByHouseholdId[householdId] = false
      }
    },

    async createCategory(householdId: string, name: string) {
      await post(`/households/${householdId}/budget-categories`, {
        name
      })
      await this.fetchCategories(householdId)
    },

    async updateCategory(householdId: string, categoryId: string, name: string) {
      await patch(`/households/${householdId}/budget-categories/${categoryId}`, {
        name
      })
      await this.fetchCategories(householdId)
    },

    async reorderCategory(householdId: string, categoryId: string, direction: 'up' | 'down') {
      await patch(`/households/${householdId}/budget-categories/${categoryId}/order/${direction}`)
      await this.fetchCategories(householdId)
    },

    async deleteCategory(householdId: string, categoryId: string) {
      await deleteRequest(`/households/${householdId}/budget-categories/${categoryId}`)
      await this.fetchCategories(householdId)
    }
  }
})
