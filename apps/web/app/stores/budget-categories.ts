import type { BudgetCategory } from '~/types/budget-categories'

const { delete: deleteRequest, get, patch, post } = useStoreApi()
type ApiBudgetCategory = Omit<BudgetCategory, 'summaryInclusionEditable'> & {
  summaryInclusionEditable?: boolean
}

export const useBudgetCategoriesStore = defineStore('budgetCategories', {
  state: () => ({
    categoriesByHouseholdId: {} as Record<string, BudgetCategory[]>,
    errorsByHouseholdId: {} as Record<string, string | null>,
    loadingByHouseholdId: {} as Record<string, boolean>,
    summaryInclusionByCategoryKey: {} as Record<string, boolean>
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
          categories: ApiBudgetCategory[]
        }>(`/households/${householdId}/budget-categories`)

        this.categoriesByHouseholdId[householdId] = withFrontendBudgetCategories(
          householdId,
          response.categories,
          this.summaryInclusionByCategoryKey
        )
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

    updateCategorySummaryInclusion(householdId: string, categoryId: string, includeInSummary: boolean) {
      const category = this.getCategories(householdId).find(item => item.id === categoryId)

      if (!category?.summaryInclusionEditable) {
        return
      }

      this.summaryInclusionByCategoryKey[getBudgetCategoryKey(householdId, categoryId)] = includeInSummary
      this.categoriesByHouseholdId[householdId] = this.getCategories(householdId).map((category) => {
        return category.id === categoryId
          ? {
              ...category,
              includeInSummary
            }
          : category
      })
    },

    async deleteCategory(householdId: string, categoryId: string) {
      await deleteRequest(`/households/${householdId}/budget-categories/${categoryId}`)
      await this.fetchCategories(householdId)
    }
  }
})

const frontendDefaultBudgetCategories: Array<{
  includeInSummary: boolean
  name: string
  summaryInclusionEditable: boolean
  type: NonNullable<BudgetCategory['type']>
}> = [
  {
    name: 'Investment / Savings',
    type: 'goals',
    includeInSummary: false,
    summaryInclusionEditable: true
  },
  {
    name: 'Credit Cards',
    type: 'credit_cards',
    includeInSummary: false,
    summaryInclusionEditable: true
  }
]

function withFrontendBudgetCategories(
  householdId: string,
  categories: ApiBudgetCategory[],
  summaryInclusionByCategoryKey: Record<string, boolean>
): BudgetCategory[] {
  const normalizedCategories = categories.map(category => toBudgetCategory(
    householdId,
    category,
    summaryInclusionByCategoryKey
  ))
  const maxOrder = normalizedCategories.reduce((order, category) => Math.max(order, category.order), 0)
  const missingCategories = frontendDefaultBudgetCategories
    .filter((defaultCategory) => {
      return !normalizedCategories.some((category) => {
        return category.type === defaultCategory.type || category.name === defaultCategory.name
      })
    })
    .map((category, index) => toBudgetCategory(
      householdId,
      {
        id: getFrontendDefaultCategoryId(category.type),
        householdId,
        name: category.name,
        type: category.type,
        order: maxOrder + index + 1,
        includeInSummary: category.includeInSummary,
        summaryInclusionEditable: category.summaryInclusionEditable,
        createdAt: '',
        updatedAt: ''
      },
      summaryInclusionByCategoryKey
    ))

  return [
    ...normalizedCategories,
    ...missingCategories
  ]
}

function toBudgetCategory(
  householdId: string,
  category: ApiBudgetCategory,
  summaryInclusionByCategoryKey: Record<string, boolean>
): BudgetCategory {
  const summaryInclusionEditable = category.summaryInclusionEditable ?? category.includeInSummary === false
  const categoryKey = getBudgetCategoryKey(householdId, category.id)

  return {
    ...category,
    includeInSummary: summaryInclusionEditable
      ? summaryInclusionByCategoryKey[categoryKey] ?? category.includeInSummary
      : true,
    summaryInclusionEditable
  }
}

function getFrontendDefaultCategoryId(type: NonNullable<BudgetCategory['type']>) {
  return `frontend-default-${type}`
}

function getBudgetCategoryKey(householdId: string, categoryId: string) {
  return `${householdId}:${categoryId}`
}
