import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { BudgetCategoriesRepository } from '../../src/modules/budget-categories/budget-categories.repository'
import { BudgetType } from '../../src/modules/budgets/entities/budget-type'
import type { BudgetsRepository } from '../../src/modules/budgets/budgets.repository'
import type { CreditCardsRepository } from '../../src/modules/credit-cards/credit-cards.repository'
import { GoalTargetType } from '../../src/modules/goals/entities/goal-target-type'
import type { GoalsRepository } from '../../src/modules/goals/goals.repository'
import { HouseholdService } from '../../src/modules/households/households.service'
import type { HouseholdsRepository } from '../../src/modules/households/households.repository'
import type { IncomeRepository } from '../../src/modules/income/income.repository'
import type { IncomeTypesRepository } from '../../src/modules/income-types/income-types.repository'
import { SubscriptionType } from '../../src/modules/subscriptions/entities/subscription-type'
import type { SubscriptionsRepository } from '../../src/modules/subscriptions/subscriptions.repository'
import type { UsersRepository } from '../../src/modules/users/users.repository'

type MockRepository = Record<string, Mock>

const now = new Date('2026-07-26T12:00:00.000Z')
const timestamps = {
  createdAt: now,
  updatedAt: now
}
const member = {
  userId: 'user-1',
  name: 'Person',
  email: 'person@example.com',
  avatarUrl: null,
  joinedAt: now
}
const user = {
  id: 'user-1',
  householdId: 'household-1',
  name: member.name,
  email: member.email,
  avatarUrl: null
}
const household = {
  householdId: 'household-1',
  householdName: 'Home',
  joinedAt: now
}
const category = {
  id: 'category-1',
  householdId: 'household-1',
  name: 'Other',
  type: null,
  order: 1,
  inSummary: true,
  ...timestamps
}
const incomeType = {
  id: 'income-type-1',
  householdId: 'household-1',
  text: 'Salary',
  ...timestamps
}
const income = {
  id: 'income-1',
  incomeTypeId: incomeType.id,
  incomeType,
  userId: user.id,
  amount: 1250,
  date: '2026-07-15',
  ...timestamps
}
const monthBudget = {
  id: 'budget-month',
  householdId: household.householdId,
  type: BudgetType.Month,
  startDate: '2026-07-01',
  endDate: '2026-07-31',
  isActive: true,
  ...timestamps
}
const weekBudget = {
  id: 'budget-week',
  householdId: household.householdId,
  type: BudgetType.Week,
  startDate: '2026-07-13',
  endDate: '2026-07-19',
  isActive: false,
  ...timestamps
}
const subscription = {
  id: 'subscription-1',
  householdId: household.householdId,
  userId: user.id,
  user: null,
  name: 'Streaming',
  type: SubscriptionType.Monthly,
  startDate: '2026-01-15',
  endDate: null,
  autopay: true,
  dates: [{ subscriptionId: 'subscription-1', date: '2026-07-15' }],
  amounts: [{ subscriptionId: 'subscription-1', date: '2026-01-15', amount: 20 }],
  transactions: [],
  ...timestamps
}
const subscriptionTransaction = {
  id: 'transaction-1',
  subscriptionId: subscription.id,
  userId: user.id,
  amount: 20,
  date: '2026-07-15'
}
const creditCard = {
  id: 'credit-card-1',
  householdId: household.householdId,
  userId: user.id,
  user: null,
  name: 'Rewards',
  startDate: '2026-01-01',
  endDate: null,
  dueDate: '2026-01-20',
  balances: [{ id: 'balance-1', creditCardId: 'credit-card-1', date: '2026-01-01', balance: 300 }],
  limits: [{ id: 'limit-1', creditCardId: 'credit-card-1', date: '2026-01-01', limit: 3000 }],
  ...timestamps
}
const goal = {
  id: 'goal-1',
  householdId: household.householdId,
  userId: user.id,
  user: null,
  name: 'Emergency fund',
  startDate: '2026-01-01',
  endDate: null,
  includeInBudget: true,
  targets: [{
    id: 'target-1',
    goalId: 'goal-1',
    date: '2026-01-01',
    type: GoalTargetType.Monthly,
    amount: 500,
    ...timestamps
  }],
  transactions: [],
  ...timestamps
}

describe('HouseholdService', () => {
  let service: HouseholdService
  let budgetCategoriesRepository: MockRepository
  let budgetsRepository: MockRepository
  let creditCardsRepository: MockRepository
  let goalsRepository: MockRepository
  let householdsRepository: MockRepository
  let incomeRepository: MockRepository
  let incomeTypesRepository: MockRepository
  let subscriptionsRepository: MockRepository
  let usersRepository: MockRepository

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)

    budgetCategoriesRepository = repositoryMock({
      listByHouseholdId: [category],
      create: category,
      updateName: category,
      reorder: category,
      delete: 'deleted'
    })
    budgetsRepository = repositoryMock({
      ensureBudgets: 0,
      listByHouseholdIdAndStartDates: [monthBudget, weekBudget],
      findByIdAndHouseholdId: monthBudget
    })
    creditCardsRepository = repositoryMock({
      listByHouseholdId: [creditCard],
      listByUserId: [creditCard],
      create: creditCard,
      update: creditCard,
      cancel: true,
      updateBalance: creditCard.balances[0],
      findByIdAndHouseholdId: creditCard,
      findById: creditCard
    })
    goalsRepository = repositoryMock({
      listByHouseholdId: [goal],
      create: goal,
      update: goal,
      end: goal,
      delete: true,
      findByIdAndHouseholdId: goal,
      hasTransactions: false,
      countTransactions: 0
    })
    householdsRepository = repositoryMock({
      create: { id: household.householdId, name: household.householdName },
      updateName: { id: household.householdId, name: household.householdName }
    })
    incomeRepository = repositoryMock({
      create: income,
      listByUserIdAndDateRange: [income],
      listByHouseholdIdAndDateRange: [income]
    })
    incomeTypesRepository = repositoryMock({
      listByHouseholdId: [incomeType],
      create: incomeType,
      findByIdAndHouseholdId: incomeType,
      updateText: incomeType,
      delete: true
    })
    subscriptionsRepository = repositoryMock({
      listByHouseholdId: [subscription],
      listByUserId: [subscription],
      listByHouseholdIdAndDateRange: [subscription],
      listByUserIdAndDateRange: [subscription],
      create: subscription,
      update: subscription,
      findByIdAndHouseholdId: subscription,
      findById: subscription,
      listSubscriptionTransactionsByHouseholdIdAndDateRange: [subscriptionTransaction],
      listSubscriptionTransactionsByUserIdAndDateRange: [subscriptionTransaction],
      findSubscriptionTransactionByIdAndDateRange: subscriptionTransaction,
      createSubscriptionTransaction: subscriptionTransaction,
      deleteSubscriptionTransaction: true,
      deleteTransactionsAfterDate: true,
      deleteSubscriptionDatesAfterDate: true
    })
    usersRepository = repositoryMock({
      findByHouseholdIdAndUserId: user,
      findHouseholdByUserId: household,
      findHouseholdByHouseholdIdAndUserId: household,
      findBudgetUserByHouseholdIdAndUserId: {
        householdId: household.householdId,
        householdName: household.householdName,
        userId: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl
      },
      listByHouseholdId: [member]
    })

    service = new HouseholdService(
      budgetCategoriesRepository as unknown as BudgetCategoriesRepository,
      budgetsRepository as unknown as BudgetsRepository,
      creditCardsRepository as unknown as CreditCardsRepository,
      goalsRepository as unknown as GoalsRepository,
      householdsRepository as unknown as HouseholdsRepository,
      incomeRepository as unknown as IncomeRepository,
      incomeTypesRepository as unknown as IncomeTypesRepository,
      subscriptionsRepository as unknown as SubscriptionsRepository,
      usersRepository as unknown as UsersRepository
    )
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('serves household, budget, category, and income workflows', async () => {
    await expect(service.getDashboard(household.householdId, user.id)).resolves.toMatchObject({
      household,
      members: [member]
    })
    await expect(service.getHouseholdForCurrentUser(user.id)).resolves.toMatchObject({
      household: {
        householdId: household.householdId,
        householdName: household.householdName
      }
    })
    await expect(service.update(household.householdId, user.id, { name: ' Home ' })).resolves.toMatchObject({
      household: { householdName: household.householdName }
    })
    await expect(service.getUserBudgetMonthPeriodForCurrentUser(user.id, 'household', {
      month: 7,
      year: 2026
    })).resolves.toMatchObject({
      month: { id: monthBudget.id },
      weeks: [{ id: weekBudget.id }]
    })
    await expect(service.listBudgetCategories(household.householdId, user.id)).resolves.toMatchObject({
      categories: [{ id: category.id, includeInSummary: true }]
    })
    await expect(service.createBudgetCategory(household.householdId, user.id, { name: ' Other ' })).resolves.toMatchObject({
      category: { name: category.name }
    })
    await expect(service.updateBudgetCategory(household.householdId, user.id, category.id, { name: ' Other ' })).resolves.toMatchObject({
      category: { id: category.id }
    })
    await expect(service.reorderBudgetCategory(household.householdId, user.id, category.id, 'up')).resolves.toMatchObject({
      category: { id: category.id }
    })
    await expect(service.deleteBudgetCategory(household.householdId, user.id, category.id)).resolves.toEqual({ deleted: true })
    await expect(service.listIncomeTypes(household.householdId, user.id)).resolves.toMatchObject({
      incomeTypes: [{ text: incomeType.text }]
    })
    await expect(service.createIncomeType(household.householdId, user.id, { text: ' Salary ' })).resolves.toMatchObject({
      incomeType: { id: incomeType.id }
    })
    await expect(service.updateIncomeType(household.householdId, user.id, incomeType.id, { text: ' Salary ' })).resolves.toMatchObject({
      incomeType: { text: incomeType.text }
    })
    await expect(service.deleteIncomeType(household.householdId, user.id, incomeType.id)).resolves.toEqual({ deleted: true })
    await expect(service.listIncomeForCurrentUser(user.id, 'household', monthBudget.id)).resolves.toMatchObject({
      incomes: [{ id: income.id, incomeTypeText: incomeType.text }]
    })
    await expect(service.listIncomeForCurrentUser(user.id, user.id, monthBudget.id)).resolves.toMatchObject({
      incomes: [{ id: income.id }]
    })
    await expect(service.createIncomeForCurrentUser(user.id, user.id, monthBudget.id, {
      amount: income.amount,
      date: income.date,
      incomeTypeId: incomeType.id
    })).resolves.toMatchObject({
      income: { amount: income.amount }
    })
  })

  it('serves subscription and subscription transaction workflows', async () => {
    const dateRange = { fromDate: '2026-07-01', toDate: '2026-07-31' }
    const saveInput = {
      name: ' Streaming ',
      type: SubscriptionType.Monthly,
      startDate: '2026-01-15',
      endDate: null,
      nextChargeDate: '2026-07-15',
      amount: 20,
      autopay: true,
      userId: user.id
    }

    await expect(service.listSubscriptions(household.householdId, user.id)).resolves.toMatchObject({
      subscriptions: []
    })
    await expect(service.listUserSubscriptions(user.id, user.id)).resolves.toMatchObject({
      subscriptions: [{ id: subscription.id, amount: 20 }]
    })
    await expect(service.createSubscription(household.householdId, user.id, saveInput)).resolves.toMatchObject({
      subscription: { id: subscription.id }
    })
    await expect(service.createUserSubscription(user.id, user.id, saveInput)).resolves.toMatchObject({
      subscription: { id: subscription.id }
    })
    await expect(service.updateSubscription(household.householdId, user.id, subscription.id, saveInput)).resolves.toMatchObject({
      subscription: { name: subscription.name }
    })
    await expect(service.updateSubscriptionForCurrentUser(user.id, subscription.id, saveInput)).resolves.toMatchObject({
      subscription: { id: subscription.id }
    })
    await expect(service.cancelSubscription(household.householdId, user.id, subscription.id, {
      effectiveDate: '2026-07-31'
    })).resolves.toMatchObject({
      subscription: { id: subscription.id }
    })
    await expect(service.cancelSubscriptionForCurrentUser(user.id, subscription.id, {
      effectiveDate: '2026-07-31'
    })).resolves.toMatchObject({
      subscription: { id: subscription.id }
    })
    await expect(service.listSubscriptionsForCurrentUser(user.id, 'household', dateRange)).resolves.toMatchObject({
      subscriptions: [{ id: subscription.id, occurrenceDate: '2026-07-15' }]
    })
    await expect(service.listSubscriptionsForCurrentUser(user.id, user.id, dateRange)).resolves.toMatchObject({
      subscriptions: [{ id: subscription.id }]
    })
    await expect(service.listBudgetTransactionsForCurrentUser(user.id, 'household', monthBudget.id, dateRange)).resolves.toMatchObject({
      subscription_transactions: [{ id: subscriptionTransaction.id }]
    })
    await expect(service.listBudgetTransactionsForCurrentUser(user.id, user.id, monthBudget.id, dateRange)).resolves.toMatchObject({
      subscription_transactions: [{ id: subscriptionTransaction.id }]
    })
    await expect(service.createSubscriptionTransactionForCurrentUser(user.id, user.id, monthBudget.id, {
      subscriptionId: subscription.id,
      occurrenceDate: '2026-07-15'
    })).resolves.toMatchObject({
      subscription_transactions: [{ id: subscriptionTransaction.id }]
    })
    await expect(service.deleteSubscriptionTransactionForCurrentUser(user.id, user.id, monthBudget.id, subscriptionTransaction.id)).resolves.toEqual({
      deleted: true
    })
  })

  it('serves credit card and goal workflows', async () => {
    const dateRange = { fromDate: '2026-07-01', toDate: '2026-07-31' }
    const cardInput = {
      name: ' Rewards ',
      userId: user.id,
      startDate: '2026-01-01',
      dueDate: '2026-01-20',
      limit: 3000,
      balance: 300
    }
    const goalInput = {
      name: ' Emergency fund ',
      userId: user.id,
      startDate: '2026-01-01',
      endDate: null,
      includeInBudget: true,
      targetType: GoalTargetType.Monthly,
      targetAmount: 500
    }

    await expect(service.listCreditCards(household.householdId, user.id)).resolves.toMatchObject({ creditCards: [] })
    await expect(service.listUserCreditCards(user.id, user.id)).resolves.toMatchObject({
      creditCards: [{ id: creditCard.id, currentBalance: 300 }]
    })
    await expect(service.createHouseholdCreditCard(household.householdId, user.id, cardInput)).resolves.toMatchObject({
      creditCard: { id: creditCard.id }
    })
    await expect(service.createUserCreditCard(user.id, user.id, cardInput)).resolves.toMatchObject({
      creditCard: { id: creditCard.id }
    })
    await expect(service.updateCreditCard(household.householdId, user.id, creditCard.id, cardInput)).resolves.toMatchObject({
      creditCard: { name: creditCard.name }
    })
    await expect(service.updateCreditCardForCurrentUser(user.id, creditCard.id, cardInput)).resolves.toMatchObject({
      creditCard: { id: creditCard.id }
    })
    await expect(service.cancelCreditCard(household.householdId, user.id, creditCard.id, {
      effectiveDate: '2026-07-26'
    })).resolves.toEqual({ canceled: true })
    await expect(service.cancelCreditCardForCurrentUser(user.id, creditCard.id, {
      effectiveDate: '2026-07-26'
    })).resolves.toEqual({ canceled: true })
    await expect(service.updateCreditCardBalance(household.householdId, user.id, creditCard.id, {
      balance: 250,
      date: '2026-07-26'
    })).resolves.toMatchObject({ balance: { balance: 300 } })
    await expect(service.updateCreditCardBalanceForCurrentUser(user.id, creditCard.id, {
      balance: 250,
      date: '2026-07-26'
    })).resolves.toMatchObject({ balance: { balance: 300 } })
    await expect(service.listBudgetCreditCardsForCurrentUser(user.id, 'household', dateRange)).resolves.toMatchObject({
      creditCards: [{ id: creditCard.id, amount: 300 }]
    })
    await expect(service.listBudgetCreditCardsForCurrentUser(user.id, user.id, dateRange)).resolves.toMatchObject({
      creditCards: [{ id: creditCard.id }]
    })

    await expect(service.listGoals(household.householdId, user.id)).resolves.toMatchObject({
      goals: [{ id: goal.id, currentTarget: { amount: 500 } }]
    })
    await expect(service.createGoal(household.householdId, user.id, goalInput)).resolves.toMatchObject({
      goal: { id: goal.id }
    })
    await expect(service.updateGoal(household.householdId, user.id, goal.id, goalInput)).resolves.toMatchObject({
      goal: { name: goal.name }
    })
    await expect(service.listBudgetGoalsForCurrentUser(user.id, 'household', dateRange)).resolves.toMatchObject({
      goals: [{ id: goal.id, amount: 500 }]
    })
    await expect(service.listBudgetGoalsForCurrentUser(user.id, user.id, dateRange)).resolves.toMatchObject({
      goals: [{ id: goal.id }]
    })
    await expect(service.deleteGoal(household.householdId, user.id, goal.id)).resolves.toEqual({ deleted: true })
    await expect(service.permanentlyDeleteGoal(household.householdId, user.id, goal.id)).resolves.toEqual({ deleted: true })
  })

  it('rejects missing ownership, malformed input, protected resources, and invalid dates', async () => {
    usersRepository.findHouseholdByHouseholdIdAndUserId.mockResolvedValueOnce(null)
    await expect(service.getDashboard(household.householdId, user.id)).rejects.toBeInstanceOf(NotFoundException)

    await expect(service.update(household.householdId, user.id, { name: ' ' })).rejects.toBeInstanceOf(BadRequestException)
    await expect(service.createBudgetCategory(household.householdId, user.id, { name: '' })).rejects.toBeInstanceOf(BadRequestException)
    await expect(service.createIncomeType(household.householdId, user.id, { text: '' })).rejects.toBeInstanceOf(BadRequestException)
    await expect(service.createIncomeForCurrentUser(user.id, 'household', monthBudget.id, {
      amount: 10,
      date: '2026-07-01',
      incomeTypeId: incomeType.id
    })).rejects.toBeInstanceOf(BadRequestException)
    await expect(service.createIncomeForCurrentUser(user.id, user.id, monthBudget.id, {
      amount: -1,
      date: '2026-07-01',
      incomeTypeId: incomeType.id
    })).rejects.toBeInstanceOf(BadRequestException)

    budgetCategoriesRepository.updateName.mockResolvedValueOnce('protected')
    await expect(service.updateBudgetCategory(household.householdId, user.id, category.id, {
      name: category.name
    })).rejects.toBeInstanceOf(BadRequestException)
    budgetCategoriesRepository.delete.mockResolvedValueOnce('not-found')
    await expect(service.deleteBudgetCategory(household.householdId, user.id, category.id)).rejects.toBeInstanceOf(NotFoundException)

    usersRepository.listByHouseholdId.mockResolvedValueOnce([member, { ...member, userId: 'user-2' }])
    await expect(service.createSubscription(household.householdId, user.id, {
      name: 'Subscription',
      type: SubscriptionType.Monthly,
      startDate: 'bad-date',
      amount: 10,
      userId: null
    })).rejects.toBeInstanceOf(BadRequestException)
    await expect(service.createUserSubscription(user.id, 'user-2', {
      name: 'Subscription',
      type: SubscriptionType.Monthly,
      startDate: '2026-01-01',
      amount: 10
    })).rejects.toBeInstanceOf(ForbiddenException)
    await expect(service.updateCreditCardBalance(household.householdId, user.id, creditCard.id, {
      balance: -1,
      date: '2026-07-26'
    })).rejects.toBeInstanceOf(BadRequestException)
    await expect(service.cancelCreditCard(household.householdId, user.id, creditCard.id, {
      effectiveDate: '2025-01-01'
    })).rejects.toBeInstanceOf(BadRequestException)

    goalsRepository.hasTransactions.mockResolvedValueOnce(true)
    await expect(service.permanentlyDeleteGoal(household.householdId, user.id, goal.id)).rejects.toBeInstanceOf(BadRequestException)
  })
})

function repositoryMock(values: Record<string, unknown>): MockRepository {
  return Object.fromEntries(
    Object.entries(values).map(([method, value]) => [method, vi.fn().mockResolvedValue(value)])
  )
}
