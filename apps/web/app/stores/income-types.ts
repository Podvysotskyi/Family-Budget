import type { IncomeType } from '~/types/income-types'

const { delete: deleteRequest, get, patch, post } = useStoreApi()

export const useIncomeTypesStore = defineStore('incomeTypes', {
  state: () => ({
    errorsByHouseholdId: {} as Record<string, string | null>,
    incomeTypesByHouseholdId: {} as Record<string, IncomeType[]>,
    loadingByHouseholdId: {} as Record<string, boolean>
  }),

  actions: {
    getIncomeTypes(householdId: string) {
      return this.incomeTypesByHouseholdId[householdId] || []
    },

    isLoading(householdId: string) {
      return this.loadingByHouseholdId[householdId] || false
    },

    getError(householdId: string) {
      return this.errorsByHouseholdId[householdId] || null
    },

    async fetchIncomeTypes(householdId: string) {
      if (!householdId) {
        return
      }

      this.loadingByHouseholdId[householdId] = true
      this.errorsByHouseholdId[householdId] = null

      try {
        const response = await get<{
          incomeTypes: IncomeType[]
        }>(`/households/${householdId}/income-types`)

        this.incomeTypesByHouseholdId[householdId] = response.incomeTypes
      } catch {
        this.errorsByHouseholdId[householdId] = 'Income types could not be loaded'
      } finally {
        this.loadingByHouseholdId[householdId] = false
      }
    },

    async createIncomeType(householdId: string, text: string) {
      const response = await post<{
        incomeType: IncomeType
      }>(`/households/${householdId}/income-types`, {
        text
      })

      this.incomeTypesByHouseholdId[householdId] = [
        ...this.getIncomeTypes(householdId),
        response.incomeType
      ].toSorted((left, right) => left.text.localeCompare(right.text))

      return response.incomeType
    },

    async updateIncomeType(householdId: string, incomeTypeId: string, text: string) {
      await patch(`/households/${householdId}/income-types/${incomeTypeId}`, {
        text
      })
      await this.fetchIncomeTypes(householdId)
    },

    async deleteIncomeType(householdId: string, incomeTypeId: string) {
      await deleteRequest(`/households/${householdId}/income-types/${incomeTypeId}`)
      await this.fetchIncomeTypes(householdId)
    }
  }
})
