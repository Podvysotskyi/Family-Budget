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
  date: string
  id: string
  subscriptionId: string
  userId: string
}

export type BudgetSubscriptionPayment = BudgetSubscription & {
  isPaid: boolean
  transactionId: string | null
}

export type MonthBudgetResponse = {
  month: BudgetPeriod
  weeks: BudgetPeriod[]
}
