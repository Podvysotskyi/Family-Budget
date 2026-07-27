import { mockComponent, mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BudgetWorkspace from '../../app/components/budget/BudgetWorkspace.vue'

const mocks = vi.hoisted(() => {
  const month = {
    id: 'month-budget',
    type: 'month',
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    isActive: true
  }
  const week = {
    id: 'week-budget',
    type: 'week',
    startDate: '2026-07-06',
    endDate: '2026-07-12',
    isActive: false
  }
  const subscription = {
    id: 'subscription-1',
    name: 'Streaming',
    userId: 'user-1',
    occurrenceDate: '2026-07-15',
    amount: 20
  }

  return {
    categories: {
      fetchCategories: vi.fn().mockResolvedValue(undefined),
      getError: vi.fn(() => null),
      getCategories: vi.fn(() => [
        { id: 'subscriptions', type: 'subscriptions', includeInSummary: true },
        { id: 'cards', type: 'credit_cards', includeInSummary: true },
        { id: 'goals', type: 'goals', includeInSummary: true }
      ]),
      isLoading: vi.fn(() => false),
      updateCategorySummaryInclusion: vi.fn().mockResolvedValue(undefined)
    },
    dashboard: {
      householdId: 'household-1',
      fetchDashboard: vi.fn().mockResolvedValue(undefined)
    },
    incomeTypes: {
      createIncomeType: vi.fn().mockResolvedValue({
        id: 'income-type-2',
        text: 'Bonus'
      }),
      fetchIncomeTypes: vi.fn().mockResolvedValue(undefined),
      getIncomeTypes: vi.fn(() => [{
        id: 'income-type-1',
        text: 'Salary'
      }])
    },
    budgets: {
      createIncome: vi.fn().mockResolvedValue({ id: 'income-2' }),
      fetchIncomeEntries: vi.fn().mockResolvedValue(undefined),
      fetchMonthBudget: vi.fn().mockResolvedValue(undefined),
      fetchSubscriptionTransactions: vi.fn().mockResolvedValue(undefined),
      fetchUserCreditCards: vi.fn().mockResolvedValue(undefined),
      fetchUserGoals: vi.fn().mockResolvedValue(undefined),
      fetchUserSubscriptions: vi.fn().mockResolvedValue(undefined),
      getBudgetPeriods: vi.fn(() => [month, week]),
      getIncomeEntries: vi.fn(() => [{
        id: 'income-1',
        incomeTypeId: 'income-type-1',
        incomeTypeText: 'Salary',
        amount: 1000,
        date: '2026-07-01'
      }]),
      getMonthBudget: vi.fn<() => typeof month | null>(() => month),
      getMonthBudgetError: vi.fn(() => null),
      getUserCreditCards: vi.fn(() => [{
        id: 'card-1',
        name: 'Rewards',
        userId: 'user-1',
        occurrenceDate: '2026-07-10',
        amount: 100,
        limit: 1000
      }]),
      getUserCreditCardsError: vi.fn(() => null),
      getUserGoals: vi.fn(() => [{
        id: 'goal-1',
        name: 'Emergency',
        userId: 'user-1',
        occurrenceDate: '2026-07-01',
        targetType: 'monthly',
        amount: 500
      }]),
      getUserGoalsError: vi.fn(() => null),
      getUserSubscriptions: vi.fn(() => [subscription]),
      getUserSubscriptionsError: vi.fn(() => null),
      getUserSubscriptionTransactions: vi.fn(() => [{
        id: 'transaction-1',
        subscriptionId: 'subscription-1',
        userId: 'user-1',
        amount: 20,
        date: '2026-07-15'
      }]),
      getUserSubscriptionTransactionsError: vi.fn(() => null),
      hasIncomeEntriesLoaded: vi.fn(() => true),
      hasUserCreditCardsLoaded: vi.fn(() => true),
      hasUserGoalsLoaded: vi.fn(() => true),
      hasUserSubscriptionsLoaded: vi.fn(() => true),
      hasUserSubscriptionTransactionsLoaded: vi.fn(() => true),
      isIncomeEntriesLoading: vi.fn(() => false),
      isMonthBudgetLoading: vi.fn(() => false),
      isUserCreditCardsLoading: vi.fn(() => false),
      isUserGoalsLoading: vi.fn(() => false),
      isUserSubscriptionsLoading: vi.fn(() => false),
      isUserSubscriptionTransactionsLoading: vi.fn(() => false),
      markSubscriptionPaid: vi.fn().mockResolvedValue(undefined),
      markSubscriptionUnpaid: vi.fn().mockResolvedValue(undefined)
    },
    month,
    week,
    subscription
  }
})

mockNuxtImport('useBudgetCategoriesStore', () => () => mocks.categories)
mockNuxtImport('useBudgetsStore', () => () => mocks.budgets)
mockNuxtImport('useDashboardStore', () => () => mocks.dashboard)
mockNuxtImport('useIncomeTypesStore', () => () => mocks.incomeTypes)

mockComponent('BudgetCategoriesPanel', async () => {
  const { defineComponent, h } = await import('vue')
  return defineComponent({
    name: 'BudgetCategoriesPanel',
    emits: ['mark-subscription-paid', 'mark-subscription-unpaid'],
    setup: (_, { slots }) => () => h('div', { 'data-component': 'categories' }, slots.default?.())
  })
})

mockComponent('AddIncomeModal', async () => {
  const { defineComponent, h } = await import('vue')
  return defineComponent({
    name: 'AddIncomeModal',
    emits: ['submit', 'update:open'],
    setup: () => () => h('div', { 'data-component': 'income-modal' })
  })
})

describe('BudgetWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.dashboard.householdId = 'household-1'
    mocks.budgets.getBudgetPeriods.mockReturnValue([mocks.month, mocks.week])
    mocks.budgets.getMonthBudget.mockReturnValue(mocks.month)
    mocks.budgets.getUserSubscriptions.mockReturnValue([mocks.subscription])
    mocks.budgets.getUserSubscriptionTransactions.mockReturnValue([{
      id: 'transaction-1',
      subscriptionId: mocks.subscription.id,
      userId: 'user-1',
      amount: 20,
      date: mocks.subscription.occurrenceDate
    }])
  })

  it('loads, summarizes, navigates, and selects budget periods', async () => {
    const wrapper = await mountSuspended(BudgetWorkspace, {
      props: {
        budgetUserId: 'user-1',
        title: 'Person budget'
      },
      route: '/budget/user-1?month=7&year=2026'
    })

    expect(wrapper.text()).toContain('Person budget')
    expect(wrapper.text()).toContain('July 2026')
    expect(mocks.dashboard.fetchDashboard).toHaveBeenCalled()
    expect(mocks.categories.fetchCategories).toHaveBeenCalledWith('household-1')
    expect(mocks.budgets.fetchMonthBudget).toHaveBeenCalledWith('user-1', 7, 2026)

    await wrapper.get('[aria-label="Previous month"]').trigger('click')
    await wrapper.get('[aria-label="Next month"]').trigger('click')
    await wrapper.get('button:not([aria-label])').trigger('click')

    const periodButtons = wrapper.findAll('button').filter((button) => {
      return button.text() === 'Month' || button.text().includes('Jul')
    })
    await periodButtons.at(-1)?.trigger('click')
    await periodButtons[0]?.trigger('click')
    expect(mocks.budgets.fetchMonthBudget).toHaveBeenCalledWith('user-1', 7, 2026, { force: true })
  })

  it('handles income creation and subscription payment events', async () => {
    const wrapper = await mountSuspended(BudgetWorkspace, {
      props: { budgetUserId: 'user-1' },
      route: '/budget/user-1?month=7&year=2026'
    })
    const incomeModal = wrapper.findComponent({ name: 'AddIncomeModal' })
    incomeModal.vm.$emit('update:open', true)
    await vi.waitFor(() => expect(mocks.incomeTypes.fetchIncomeTypes).toHaveBeenCalled())

    incomeModal.vm.$emit('submit', {
      amount: 200,
      incomeTypeId: 'income-type-1'
    })
    await vi.waitFor(() => expect(mocks.budgets.createIncome).toHaveBeenCalledWith(
      'user-1',
      mocks.month.id,
      {
        incomeTypeId: 'income-type-1',
        amount: 200,
        date: mocks.month.startDate
      }
    ))

    incomeModal.vm.$emit('submit', {
      amount: 300,
      newIncomeTypeText: ' Bonus '
    })
    await vi.waitFor(() => expect(mocks.incomeTypes.createIncomeType).toHaveBeenCalledWith('household-1', 'Bonus'))

    const categories = wrapper.findComponent({ name: 'BudgetCategoriesPanel' })
    categories.vm.$emit('mark-subscription-paid', {
      ...mocks.subscription,
      isPaid: false,
      transactionId: null
    })
    categories.vm.$emit('mark-subscription-unpaid', {
      ...mocks.subscription,
      isPaid: true,
      transactionId: 'transaction-1'
    })
    await vi.waitFor(() => expect(mocks.budgets.markSubscriptionPaid).toHaveBeenCalled())
    expect(mocks.budgets.markSubscriptionUnpaid).toHaveBeenCalled()
  })

  it('covers invalid queries, empty periods, and action failures', async () => {
    mocks.budgets.getBudgetPeriods.mockReturnValue([])
    mocks.budgets.getMonthBudget.mockReturnValue(null)
    mocks.dashboard.householdId = ''

    const wrapper = await mountSuspended(BudgetWorkspace, {
      props: { budgetUserId: 'user-1' },
      route: '/budget/user-1?month=invalid&year=4000'
    })
    expect(wrapper.text()).toContain('No budget periods found.')

    const incomeModal = wrapper.findComponent({ name: 'AddIncomeModal' })
    incomeModal.vm.$emit('update:open', true)
    incomeModal.vm.$emit('submit', {
      amount: 100,
      incomeTypeId: 'missing'
    })

    expect(mocks.budgets.createIncome).not.toHaveBeenCalled()
  })
})
