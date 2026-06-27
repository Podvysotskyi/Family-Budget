export type BudgetPeriod = {
  id: string
  type: 'month' | 'week'
  startDate: string
  endDate: string
  isActive: boolean
}

export type Income = {
  id: string
  incomeTypeId: string
  incomeTypeText: string
  amount: number
  date: string
}

type MonthBudgetResponse = {
  month: BudgetPeriod
  weeks: BudgetPeriod[]
}

export const useBudgetsStore = defineStore('budgets', {
  state: () => ({
    incomeErrorsByBudgetId: {} as Record<string, string | null>,
    incomesByBudgetId: {} as Record<string, Income[]>,
    incomeLoadingByBudgetId: {} as Record<string, boolean>,
    monthBudgetErrorsByKey: {} as Record<string, string | null>,
    monthBudgetsByKey: {} as Record<string, MonthBudgetResponse>,
    monthBudgetLoadingByKey: {} as Record<string, boolean>,
    periodErrorsByKey: {} as Record<string, string | null>,
    periodLoadingByKey: {} as Record<string, boolean>
  }),

  actions: {
    getBudgetPeriods(userId: string, month: number, year: number) {
      const monthBudget = this.getMonthBudgetResponse(userId, month, year)

      if (!monthBudget) {
        return []
      }

      return [
        monthBudget.month,
        ...monthBudget.weeks
      ]
    },

    getIncomeEntries(budgetId: string) {
      return this.incomesByBudgetId[budgetId] || []
    },

    getMonthBudget(userId: string, month: number, year: number) {
      return this.getMonthBudgetResponse(userId, month, year)?.month || null
    },

    getMonthBudgetError(userId: string, month: number, year: number) {
      return this.monthBudgetErrorsByKey[this.getMonthKey(userId, month, year)] || null
    },

    getMonthBudgetResponse(userId: string, month: number, year: number) {
      return this.monthBudgetsByKey[this.getMonthKey(userId, month, year)] || null
    },

    async createIncome(userId: string, budgetId: string, payload: {
      amount: number
      date: string
      incomeTypeId: string
    }) {
      const response = await storeApiFetch<{
        income: Income
      }>(`/user/${userId}/budget/${budgetId}/income`, {
        method: 'POST',
        body: payload
      })

      this.incomesByBudgetId[budgetId] = [
        ...this.getIncomeEntries(budgetId),
        response.income
      ]

      return response.income
    },

    async fetchIncomeEntries(userId: string, budgetId: string) {
      if (!budgetId || this.incomeLoadingByBudgetId[budgetId]) {
        return
      }

      this.incomeLoadingByBudgetId[budgetId] = true
      this.incomeErrorsByBudgetId[budgetId] = null

      try {
        const response = await storeApiFetch<{
          incomes: Income[]
        }>(`/user/${userId}/budget/${budgetId}/income`)

        this.incomesByBudgetId[budgetId] = response.incomes
      } catch {
        this.incomeErrorsByBudgetId[budgetId] = 'Income could not be loaded'
      } finally {
        this.incomeLoadingByBudgetId[budgetId] = false
      }
    },

    async fetchMonthBudget(userId: string, month: number, year: number, options: { force?: boolean } = {}) {
      const key = this.getMonthKey(userId, month, year)

      if (this.monthBudgetLoadingByKey[key]) {
        return
      }

      if (this.monthBudgetsByKey[key] && !options.force) {
        return
      }

      this.monthBudgetLoadingByKey[key] = true
      this.monthBudgetErrorsByKey[key] = null

      try {
        const query = new URLSearchParams({
          month: String(month),
          year: String(year)
        })

        this.monthBudgetsByKey[key] = await storeApiFetch<MonthBudgetResponse>(`/users/${userId}/budget-period/month?${query.toString()}`)
      } catch {
        this.monthBudgetErrorsByKey[key] = 'Budget period could not be loaded'
      } finally {
        this.monthBudgetLoadingByKey[key] = false
      }
    },

    async fetchWeekBudget(userId: string, month: number, year: number, startDate: string) {
      const key = this.getPeriodKey(userId, 'week', startDate)

      this.periodLoadingByKey[key] = true
      this.periodErrorsByKey[key] = null

      try {
        const query = new URLSearchParams({
          month: String(month),
          startDate,
          year: String(year)
        })
        const response = await storeApiFetch<{
          budget: BudgetPeriod
        }>(`/users/${userId}/budget-period/week?${query.toString()}`)
        const monthKey = this.getMonthKey(userId, month, year)
        const monthBudget = this.monthBudgetsByKey[monthKey]

        if (monthBudget) {
          monthBudget.weeks = monthBudget.weeks.map(week => week.startDate === startDate ? response.budget : week)
        }

        return response.budget
      } catch {
        this.periodErrorsByKey[key] = 'Budget period could not be loaded'
        throw new Error('Budget period could not be loaded')
      } finally {
        this.periodLoadingByKey[key] = false
      }
    },

    getMonthKey(userId: string, month: number, year: number) {
      return `${userId}:${year}:${month}`
    },

    getPeriodKey(userId: string, type: BudgetPeriod['type'], startDate: string) {
      return `${userId}:${type}:${startDate}`
    }
  }
})
