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

export type BudgetSubscription = {
  id: string
  name: string
  userId: string | null
  occurrenceDate: string
  amount: number
}

export type SubscriptionTransaction = {
  amount: number
  id: string
  subscriptionId: string
  userId: string
}

export type BudgetSubscriptionPayment = BudgetSubscription & {
  isPaid: boolean
  transactionId: string | null
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
    subscriptionErrorsByRangeKey: {} as Record<string, string | null>,
    subscriptionLoadingByRangeKey: {} as Record<string, boolean>,
    subscriptionsByRangeKey: {} as Record<string, BudgetSubscription[]>,
    transactionErrorsByBudgetId: {} as Record<string, string | null>,
    transactionLoadingByBudgetId: {} as Record<string, boolean>,
    transactionsByBudgetId: {} as Record<string, SubscriptionTransaction[]>
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

    getUserSubscriptions(userId: string, fromDate: string, toDate: string) {
      return this.subscriptionsByRangeKey[this.getSubscriptionRangeKey(userId, fromDate, toDate)] || []
    },

    getBudgetSubscriptionTransactions(budgetId: string) {
      return this.transactionsByBudgetId[budgetId] || []
    },

    getUserSubscriptionsError(userId: string, fromDate: string, toDate: string) {
      return this.subscriptionErrorsByRangeKey[this.getSubscriptionRangeKey(userId, fromDate, toDate)] || null
    },

    getBudgetSubscriptionTransactionsError(budgetId: string) {
      return this.transactionErrorsByBudgetId[budgetId] || null
    },

    isUserSubscriptionsLoading(userId: string, fromDate: string, toDate: string) {
      return this.subscriptionLoadingByRangeKey[this.getSubscriptionRangeKey(userId, fromDate, toDate)] || false
    },

    isBudgetSubscriptionTransactionsLoading(budgetId: string) {
      return this.transactionLoadingByBudgetId[budgetId] || false
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

    async fetchUserSubscriptions(userId: string, fromDate: string, toDate: string) {
      const key = this.getSubscriptionRangeKey(userId, fromDate, toDate)

      if (!userId || !fromDate || !toDate || this.subscriptionLoadingByRangeKey[key]) {
        return
      }

      this.subscriptionLoadingByRangeKey[key] = true
      this.subscriptionErrorsByRangeKey[key] = null

      try {
        const query = new URLSearchParams({
          from_date: fromDate,
          to_date: toDate
        })
        const response = await storeApiFetch<{
          subscriptions: BudgetSubscription[]
        }>(`/user/${userId}/subscriptions?${query.toString()}`)

        this.subscriptionsByRangeKey[key] = response.subscriptions
      } catch {
        this.subscriptionErrorsByRangeKey[key] = 'Subscriptions could not be loaded'
      } finally {
        this.subscriptionLoadingByRangeKey[key] = false
      }
    },

    async fetchBudgetSubscriptionTransactions(userId: string, budgetId: string) {
      if (!budgetId || this.transactionLoadingByBudgetId[budgetId]) {
        return
      }

      this.transactionLoadingByBudgetId[budgetId] = true
      this.transactionErrorsByBudgetId[budgetId] = null

      try {
        const response = await storeApiFetch<{
          subscription_transactions: SubscriptionTransaction[]
        }>(`/user/${userId}/budget/${budgetId}/transactions`)

        this.transactionsByBudgetId[budgetId] = response.subscription_transactions
      } catch {
        this.transactionErrorsByBudgetId[budgetId] = 'Subscription transactions could not be loaded'
      } finally {
        this.transactionLoadingByBudgetId[budgetId] = false
      }
    },

    async markSubscriptionPaid(userId: string, budgetId: string, subscription: BudgetSubscription) {
      const response = await storeApiFetch<{
        subscription_transactions: SubscriptionTransaction[]
      }>(`/user/${userId}/budget/${budgetId}/transactions`, {
        method: 'POST',
        body: {
          subscriptionId: subscription.id,
          occurrenceDate: subscription.occurrenceDate
        }
      })
      const transaction = response.subscription_transactions[0]

      if (transaction) {
        const budgetIds = new Set([
          budgetId,
          ...Object.values(this.monthBudgetsByKey)
            .flatMap(monthBudget => [monthBudget.month, ...monthBudget.weeks])
            .filter(period => subscription.occurrenceDate >= period.startDate && subscription.occurrenceDate <= period.endDate)
            .map(period => period.id)
        ])

        for (const subscriptionsBudgetId of budgetIds) {
          if (this.getBudgetSubscriptionTransactions(subscriptionsBudgetId).some(item => item.id === transaction.id)) {
            continue
          }

          this.transactionsByBudgetId[subscriptionsBudgetId] = [
            ...this.getBudgetSubscriptionTransactions(subscriptionsBudgetId),
            transaction
          ]
        }
      }

      return transaction
    },

    async markSubscriptionUnpaid(userId: string, budgetId: string, subscription: BudgetSubscriptionPayment) {
      if (!subscription.transactionId) {
        return
      }

      await storeApiFetch<{
        deleted: boolean
      }>(`/user/${userId}/budget/${budgetId}/transactions/${subscription.transactionId}`, {
        method: 'DELETE'
      })

      for (const subscriptionsBudgetId of Object.keys(this.transactionsByBudgetId)) {
        this.transactionsByBudgetId[subscriptionsBudgetId] = this.getBudgetSubscriptionTransactions(subscriptionsBudgetId)
          .filter(transaction => transaction.id !== subscription.transactionId)
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

    getMonthKey(userId: string, month: number, year: number) {
      return `${userId}:${year}:${month}`
    },

    getSubscriptionRangeKey(userId: string, fromDate: string, toDate: string) {
      return `${userId}:${fromDate}:${toDate}`
    }
  }
})
