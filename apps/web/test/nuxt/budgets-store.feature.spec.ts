import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBudgetsStore } from '../../app/stores/budgets'
import {
  creditCard,
  goal,
  resetStoreHarness,
  subscription,
  user
} from './support/store-harness'

const mocks = vi.hoisted(() => ({
  deleteRequest: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  waitUntil: vi.fn().mockResolvedValue(undefined)
}))

mockNuxtImport('useStoreApi', () => () => ({
  delete: mocks.deleteRequest,
  get: mocks.get,
  post: mocks.post
}))
mockNuxtImport('useAbortController', () => () => ({
  createAbortController: (store: { abortController: AbortController | null }) => {
    store.abortController?.abort()
    const controller = new AbortController()
    store.abortController = controller
    return controller
  }
}))
mockNuxtImport('useWaitUntil', () => () => ({
  waitUntil: mocks.waitUntil
}))

describe('budgets store', () => {
  beforeEach(resetStoreHarness)

  it('loads and mutates every budget resource', async () => {
    const store = useBudgetsStore()
    const period = {
      id: 'budget-1',
      type: 'month' as const,
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      isActive: true
    }
    const budgetSubscription = {
      id: subscription.id,
      name: subscription.name,
      userId: user.id,
      occurrenceDate: '2026-07-15',
      amount: 20
    }
    const transaction = {
      id: 'transaction-1',
      subscriptionId: subscription.id,
      userId: user.id,
      amount: 20,
      date: '2026-07-15'
    }
    const income = {
      id: 'income-1',
      incomeTypeId: 'income-type-1',
      incomeTypeText: 'Salary',
      amount: 1000,
      date: '2026-07-15'
    }

    mocks.get
      .mockResolvedValueOnce({ month: period, weeks: [{ ...period, id: 'week-1', type: 'week' }] })
      .mockResolvedValueOnce({ incomes: [income] })
      .mockResolvedValueOnce({ subscriptions: [budgetSubscription] })
      .mockResolvedValueOnce({ creditCards: [{ ...creditCard, occurrenceDate: '2026-07-20', userId: user.id, amount: 100, limit: 1000 }] })
      .mockResolvedValueOnce({ goals: [{ ...goal, occurrenceDate: '2026-07-01', amount: 500, targetType: 'monthly' }] })
      .mockResolvedValueOnce({ subscription_transactions: [transaction] })

    await store.fetchMonthBudget(user.id, 7, 2026)
    await store.fetchIncomeEntries(user.id, period.id)
    await store.fetchUserSubscriptions(user.id, period.startDate, period.endDate)
    await store.fetchUserCreditCards(user.id, period.startDate, period.endDate)
    await store.fetchUserGoals(user.id, period.startDate, period.endDate)
    await store.fetchSubscriptionTransactions(user.id, period.id, period.startDate, period.endDate)

    expect(store.getBudgetPeriods(user.id, 7, 2026)).toHaveLength(2)
    expect(store.getMonthBudget(user.id, 7, 2026)?.id).toBe(period.id)
    expect(store.getIncomeEntries(period.id)).toEqual([income])
    expect(store.getUserSubscriptions(user.id, period.startDate, period.endDate)).toEqual([budgetSubscription])
    expect(store.getUserCreditCards(user.id, period.startDate, period.endDate)).toHaveLength(1)
    expect(store.getUserGoals(user.id, period.startDate, period.endDate)).toHaveLength(1)
    expect(store.getUserSubscriptionTransactions(user.id, period.startDate, period.endDate)).toEqual([transaction])

    mocks.post
      .mockResolvedValueOnce({ income })
      .mockResolvedValueOnce({ subscription_transactions: [{ ...transaction, id: 'transaction-2' }] })
    await store.createIncome(user.id, period.id, {
      amount: income.amount,
      date: income.date,
      incomeTypeId: income.incomeTypeId
    })
    await store.markSubscriptionPaid(user.id, period.id, budgetSubscription)
    expect(store.getUserSubscriptionTransactions(user.id, period.startDate, period.endDate)).toHaveLength(2)
    await store.markSubscriptionUnpaid(user.id, period.id, {
      ...budgetSubscription,
      isPaid: true,
      transactionId: 'transaction-2'
    })
    expect(store.getUserSubscriptionTransactions(user.id, period.startDate, period.endDate)).toHaveLength(1)
    await store.markSubscriptionUnpaid(user.id, period.id, {
      ...budgetSubscription,
      isPaid: false,
      transactionId: null
    })
  })

  it('tracks errors and guards duplicate or incomplete budget fetches', async () => {
    const store = useBudgetsStore()
    const range = ['user-1', '2026-07-01', '2026-07-31'] as const

    mocks.get.mockRejectedValue(new Error('offline'))
    await store.fetchMonthBudget(user.id, 7, 2026, { force: true })
    await store.fetchIncomeEntries(user.id, 'budget-1')
    await store.fetchUserSubscriptions(...range)
    await store.fetchUserCreditCards(...range)
    await store.fetchUserGoals(...range)
    await store.fetchSubscriptionTransactions(user.id, 'budget-1', range[1], range[2])

    expect(store.getMonthBudgetError(user.id, 7, 2026)).toBe('Budget period could not be loaded')
    expect(store.hasIncomeEntriesLoaded('budget-1')).toBe(true)
    expect(store.getUserSubscriptionsError(...range)).toBe('Subscriptions could not be loaded')
    expect(store.getUserCreditCardsError(...range)).toBe('Credit cards could not be loaded')
    expect(store.getUserGoalsError(...range)).toBe('Goals could not be loaded')
    expect(store.getUserSubscriptionTransactionsError(...range)).toBe('Subscription transactions could not be loaded')

    await store.fetchIncomeEntries(user.id, '')
    await store.fetchUserSubscriptions('', range[1], range[2])
    await store.fetchUserCreditCards(user.id, '', range[2])
    await store.fetchUserGoals(user.id, range[1], '')
    await store.fetchSubscriptionTransactions(user.id, '', range[1], range[2])
    expect(store.getBudgetPeriods('missing', 7, 2026)).toEqual([])
  })
})
