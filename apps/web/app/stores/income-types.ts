export type IncomeType = {
  id: string
  householdId: string
  text: string
  createdAt?: string
  updatedAt?: string
}

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
        const response = await storeApiFetch<{
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
      const response = await storeApiFetch<{
        incomeType: IncomeType
      }>(`/households/${householdId}/income-types`, {
        method: 'POST',
        body: {
          text
        }
      })

      this.incomeTypesByHouseholdId[householdId] = [
        ...this.getIncomeTypes(householdId),
        response.incomeType
      ].toSorted((left, right) => left.text.localeCompare(right.text))

      return response.incomeType
    },

    async updateIncomeType(householdId: string, incomeTypeId: string, text: string) {
      await storeApiFetch(`/households/${householdId}/income-types/${incomeTypeId}`, {
        method: 'PATCH',
        body: {
          text
        }
      })
      await this.fetchIncomeTypes(householdId)
    },

    async deleteIncomeType(householdId: string, incomeTypeId: string) {
      await storeApiFetch(`/households/${householdId}/income-types/${incomeTypeId}`, {
        method: 'DELETE'
      })
      await this.fetchIncomeTypes(householdId)
    }
  }
})
