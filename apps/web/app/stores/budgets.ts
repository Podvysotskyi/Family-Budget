import type { BudgetCreditCard, BudgetGoal, BudgetPeriod, BudgetSubscription, BudgetSubscriptionPayment, Income, MonthBudgetResponse, SubscriptionTransaction } from '~/types/budgets'

const { delete: deleteRequest, get, post } = useStoreApi()

export const useBudgetsStore = defineStore('budgets', {
  state: () => ({
    incomeErrorsByBudgetId: {} as Record<string, string | null>,
    incomesByBudgetId: {} as Record<string, Income[]>,
    incomeLoadingByBudgetId: {} as Record<string, boolean>,
    creditCardErrorsByRangeKey: {} as Record<string, string | null>,
    creditCardLoadingByRangeKey: {} as Record<string, boolean>,
    creditCardsByRangeKey: {} as Record<string, BudgetCreditCard[]>,
    goalErrorsByRangeKey: {} as Record<string, string | null>,
    goalLoadingByRangeKey: {} as Record<string, boolean>,
    goalsByRangeKey: {} as Record<string, BudgetGoal[]>,
    monthBudgetErrorsByKey: {} as Record<string, string | null>,
    monthBudgetsByKey: {} as Record<string, MonthBudgetResponse>,
    monthBudgetLoadingByKey: {} as Record<string, boolean>,
    subscriptionErrorsByRangeKey: {} as Record<string, string | null>,
    subscriptionLoadingByRangeKey: {} as Record<string, boolean>,
    subscriptionsByRangeKey: {} as Record<string, BudgetSubscription[]>,
    transactionErrorsByRangeKey: {} as Record<string, string | null>,
    transactionLoadingByRangeKey: {} as Record<string, boolean>,
    transactionsByRangeKey: {} as Record<string, SubscriptionTransaction[]>
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

    isIncomeEntriesLoading(budgetId: string) {
      return this.incomeLoadingByBudgetId[budgetId] || false
    },

    hasIncomeEntriesLoaded(budgetId: string) {
      return Object.hasOwn(this.incomesByBudgetId, budgetId) || Boolean(this.incomeErrorsByBudgetId[budgetId])
    },

    getUserSubscriptions(userId: string, fromDate: string, toDate: string) {
      return this.subscriptionsByRangeKey[this.getSubscriptionRangeKey(userId, fromDate, toDate)] || []
    },

    getUserCreditCards(userId: string, fromDate: string, toDate: string) {
      return this.creditCardsByRangeKey[this.getRangeKey(userId, fromDate, toDate)] || []
    },

    getUserGoals(userId: string, fromDate: string, toDate: string) {
      return this.goalsByRangeKey[this.getRangeKey(userId, fromDate, toDate)] || []
    },

    getUserSubscriptionTransactions(userId: string, fromDate: string, toDate: string) {
      return this.transactionsByRangeKey[this.getSubscriptionRangeKey(userId, fromDate, toDate)] || []
    },

    getUserCreditCardsError(userId: string, fromDate: string, toDate: string) {
      return this.creditCardErrorsByRangeKey[this.getRangeKey(userId, fromDate, toDate)] || null
    },

    getUserGoalsError(userId: string, fromDate: string, toDate: string) {
      return this.goalErrorsByRangeKey[this.getRangeKey(userId, fromDate, toDate)] || null
    },

    getUserSubscriptionsError(userId: string, fromDate: string, toDate: string) {
      return this.subscriptionErrorsByRangeKey[this.getSubscriptionRangeKey(userId, fromDate, toDate)] || null
    },

    getUserSubscriptionTransactionsError(userId: string, fromDate: string, toDate: string) {
      return this.transactionErrorsByRangeKey[this.getSubscriptionRangeKey(userId, fromDate, toDate)] || null
    },

    isUserSubscriptionsLoading(userId: string, fromDate: string, toDate: string) {
      return this.subscriptionLoadingByRangeKey[this.getSubscriptionRangeKey(userId, fromDate, toDate)] || false
    },

    hasUserSubscriptionsLoaded(userId: string, fromDate: string, toDate: string) {
      const key = this.getSubscriptionRangeKey(userId, fromDate, toDate)

      return Object.hasOwn(this.subscriptionsByRangeKey, key) || Boolean(this.subscriptionErrorsByRangeKey[key])
    },

    isUserCreditCardsLoading(userId: string, fromDate: string, toDate: string) {
      return this.creditCardLoadingByRangeKey[this.getRangeKey(userId, fromDate, toDate)] || false
    },

    hasUserCreditCardsLoaded(userId: string, fromDate: string, toDate: string) {
      const key = this.getRangeKey(userId, fromDate, toDate)

      return Object.hasOwn(this.creditCardsByRangeKey, key) || Boolean(this.creditCardErrorsByRangeKey[key])
    },

    isUserGoalsLoading(userId: string, fromDate: string, toDate: string) {
      return this.goalLoadingByRangeKey[this.getRangeKey(userId, fromDate, toDate)] || false
    },

    hasUserGoalsLoaded(userId: string, fromDate: string, toDate: string) {
      const key = this.getRangeKey(userId, fromDate, toDate)

      return Object.hasOwn(this.goalsByRangeKey, key) || Boolean(this.goalErrorsByRangeKey[key])
    },

    isUserSubscriptionTransactionsLoading(userId: string, fromDate: string, toDate: string) {
      return this.transactionLoadingByRangeKey[this.getSubscriptionRangeKey(userId, fromDate, toDate)] || false
    },

    hasUserSubscriptionTransactionsLoaded(userId: string, fromDate: string, toDate: string) {
      const key = this.getSubscriptionRangeKey(userId, fromDate, toDate)

      return Object.hasOwn(this.transactionsByRangeKey, key) || Boolean(this.transactionErrorsByRangeKey[key])
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

    isMonthBudgetLoading(userId: string, month: number, year: number) {
      return this.monthBudgetLoadingByKey[this.getMonthKey(userId, month, year)] || false
    },

    async createIncome(userId: string, budgetId: string, payload: {
      amount: number
      date: string
      incomeTypeId: string
    }) {
      const response = await post<{
        income: Income
      }>(`/user/${userId}/budget/${budgetId}/income`, payload)

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
        const response = await get<{
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
        const response = await get<{
          subscriptions: BudgetSubscription[]
        }>(`/user/${userId}/subscriptions?${query.toString()}`)

        this.subscriptionsByRangeKey[key] = response.subscriptions
      } catch {
        this.subscriptionErrorsByRangeKey[key] = 'Subscriptions could not be loaded'
      } finally {
        this.subscriptionLoadingByRangeKey[key] = false
      }
    },

    async fetchUserCreditCards(userId: string, fromDate: string, toDate: string) {
      const key = this.getRangeKey(userId, fromDate, toDate)

      if (!userId || !fromDate || !toDate || this.creditCardLoadingByRangeKey[key]) {
        return
      }

      this.creditCardLoadingByRangeKey[key] = true
      this.creditCardErrorsByRangeKey[key] = null

      try {
        const query = new URLSearchParams({
          from_date: fromDate,
          to_date: toDate
        })
        const response = await get<{
          creditCards: BudgetCreditCard[]
        }>(`/user/${userId}/credit-cards/budget?${query.toString()}`)

        this.creditCardsByRangeKey[key] = response.creditCards
      } catch {
        this.creditCardErrorsByRangeKey[key] = 'Credit cards could not be loaded'
      } finally {
        this.creditCardLoadingByRangeKey[key] = false
      }
    },

    async fetchUserGoals(userId: string, fromDate: string, toDate: string) {
      const key = this.getRangeKey(userId, fromDate, toDate)

      if (!userId || !fromDate || !toDate || this.goalLoadingByRangeKey[key]) {
        return
      }

      this.goalLoadingByRangeKey[key] = true
      this.goalErrorsByRangeKey[key] = null

      try {
        const query = new URLSearchParams({
          from_date: fromDate,
          to_date: toDate
        })
        const response = await get<{
          goals: BudgetGoal[]
        }>(`/user/${userId}/goals/budget?${query.toString()}`)

        this.goalsByRangeKey[key] = response.goals
      } catch {
        this.goalErrorsByRangeKey[key] = 'Goals could not be loaded'
      } finally {
        this.goalLoadingByRangeKey[key] = false
      }
    },

    async fetchSubscriptionTransactions(userId: string, budgetId: string, fromDate: string, toDate: string) {
      const key = this.getSubscriptionRangeKey(userId, fromDate, toDate)

      if (!userId || !budgetId || !fromDate || !toDate || this.transactionLoadingByRangeKey[key]) {
        return
      }

      this.transactionLoadingByRangeKey[key] = true
      this.transactionErrorsByRangeKey[key] = null

      try {
        const query = new URLSearchParams({
          from_date: fromDate,
          to_date: toDate
        })
        const response = await get<{
          subscription_transactions: SubscriptionTransaction[]
        }>(`/user/${userId}/budget/${budgetId}/transactions?${query.toString()}`)

        this.transactionsByRangeKey[key] = response.subscription_transactions
      } catch {
        this.transactionErrorsByRangeKey[key] = 'Subscription transactions could not be loaded'
      } finally {
        this.transactionLoadingByRangeKey[key] = false
      }
    },

    async markSubscriptionPaid(userId: string, budgetId: string, subscription: BudgetSubscription) {
      const response = await post<{
        subscription_transactions: SubscriptionTransaction[]
      }>(`/user/${userId}/budget/${budgetId}/transactions`, {
        subscriptionId: subscription.id,
        occurrenceDate: subscription.occurrenceDate
      })
      const transaction = response.subscription_transactions[0]

      if (transaction) {
        for (const rangeKey of Object.keys(this.transactionsByRangeKey)) {
          if (!isDateInsideRangeKey(rangeKey, subscription.occurrenceDate)) {
            continue
          }

          if (this.transactionsByRangeKey[rangeKey]!.some(item => item.id === transaction.id)) {
            continue
          }

          this.transactionsByRangeKey[rangeKey] = [
            ...this.transactionsByRangeKey[rangeKey]!,
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

      await deleteRequest<{
        deleted: boolean
      }>(`/user/${userId}/budget/${budgetId}/transactions/${subscription.transactionId}`)

      for (const rangeKey of Object.keys(this.transactionsByRangeKey)) {
        this.transactionsByRangeKey[rangeKey] = this.transactionsByRangeKey[rangeKey]!
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

        this.monthBudgetsByKey[key] = await get<MonthBudgetResponse>(`/users/${userId}/budget-period/month?${query.toString()}`)
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
      return this.getRangeKey(userId, fromDate, toDate)
    },

    getRangeKey(userId: string, fromDate: string, toDate: string) {
      return `${userId}:${fromDate}:${toDate}`
    }
  }
})

function isDateInsideRangeKey(rangeKey: string, date: string) {
  const [, fromDate, toDate] = rangeKey.split(':')

  return Boolean(fromDate && toDate && date >= fromDate && date <= toDate)
}
