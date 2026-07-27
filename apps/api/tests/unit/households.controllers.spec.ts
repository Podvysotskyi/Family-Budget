import { BadRequestException, UnauthorizedException } from '@nestjs/common'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { AuthenticatedRequest } from '../../src/modules/auth/request-user'
import { HouseholdsController } from '../../src/modules/households/households.controller'
import type { HouseholdService } from '../../src/modules/households/households.service'
import { UserBudgetsController } from '../../src/modules/households/user-budgets.controller'

type MockService = Record<string, Mock>

describe('household controllers', () => {
  const requestUser = {
    id: 'user-1',
    email: 'person@example.com',
    name: 'Person',
    avatarUrl: null
  }
  let originalSecret: string | undefined
  let request: AuthenticatedRequest
  let service: MockService

  beforeEach(() => {
    originalSecret = process.env.INTERNAL_API_SECRET
    process.env.INTERNAL_API_SECRET = 'test-secret'
    request = {
      headers: {
        'x-family-budget-internal-secret': 'test-secret',
        'x-family-budget-user': Buffer.from(JSON.stringify(requestUser)).toString('base64url')
      }
    } as unknown as AuthenticatedRequest
    service = new Proxy({}, {
      get(target: MockService, property: string) {
        target[property] ??= vi.fn().mockResolvedValue({ ok: true })
        return target[property]
      }
    }) as MockService
  })

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.INTERNAL_API_SECRET
    } else {
      process.env.INTERNAL_API_SECRET = originalSecret
    }
  })

  it('forwards every household route to the service with the authenticated user', async () => {
    const controller = new HouseholdsController(service as unknown as HouseholdService)
    const input = {} as never

    await controller.dashboard('household-1', request)
    await controller.update('household-1', input, request)
    await controller.budgetCategories('household-1', request)
    await controller.createBudgetCategory('household-1', input, request)
    await controller.updateBudgetCategory('household-1', 'category-1', input, request)
    await controller.reorderBudgetCategory('household-1', 'category-1', 'up', request)
    await controller.reorderBudgetCategory('household-1', 'category-1', 'down', request)
    await controller.deleteBudgetCategory('household-1', 'category-1', request)
    await controller.incomeTypes('household-1', request)
    await controller.createIncomeType('household-1', input, request)
    await controller.updateIncomeType('household-1', 'income-type-1', input, request)
    await controller.deleteIncomeType('household-1', 'income-type-1', request)
    await controller.subscriptions('household-1', request)
    await controller.createSubscription('household-1', input, request)
    await controller.updateSubscription('household-1', 'subscription-1', input, request)
    await controller.cancelSubscription('household-1', 'subscription-1', input, request)
    await controller.creditCards('household-1', request)
    await controller.createCreditCard('household-1', input, request)
    await controller.updateCreditCard('household-1', 'card-1', input, request)
    await controller.cancelCreditCard('household-1', 'card-1', input, request)
    await controller.updateCreditCardBalance('household-1', 'card-1', input, request)
    await controller.goals('household-1', request)
    await controller.createGoal('household-1', input, request)
    await controller.updateGoal('household-1', 'goal-1', input, request)
    await controller.deleteGoal('household-1', 'goal-1', request)
    await controller.permanentlyDeleteGoal('household-1', 'goal-1', request)

    expect(service.getDashboard).toHaveBeenCalledWith('household-1', requestUser.id)
    expect(service.reorderBudgetCategory).toHaveBeenNthCalledWith(1, 'household-1', requestUser.id, 'category-1', 'up')
    expect(service.updateCreditCardBalance).toHaveBeenCalledWith('household-1', requestUser.id, 'card-1', input)
    expect(service.permanentlyDeleteGoal).toHaveBeenCalledWith('household-1', requestUser.id, 'goal-1')
  })

  it('forwards every current-user route and parses query parameters', async () => {
    const controller = new UserBudgetsController(service as unknown as HouseholdService)
    const input = {} as never

    await controller.household(request)
    await controller.userBudgetMonthPeriod('user-1', '7', '2026', request)
    await controller.userBudgetMonthPeriod('user-1', undefined, undefined, request)
    await controller.userIncome('user-1', 'budget-1', request)
    await controller.userSubscriptions('user-1', '2026-07-01', '2026-07-31', request)
    await controller.budgetCreditCards('user-1', '2026-07-01', '2026-07-31', request)
    await controller.budgetGoals('user-1', '2026-07-01', '2026-07-31', request)
    await controller.userTransactions('user-1', 'budget-1', '2026-07-01', '2026-07-31', request)
    await controller.createSubscriptionTransaction('user-1', 'budget-1', input, request)
    await controller.deleteSubscriptionTransaction('user-1', 'budget-1', 'transaction-1', request)
    await controller.createUserIncome('user-1', 'budget-1', input, request)
    await controller.userCreditCards('user-1', request)
    await controller.userPageSubscriptions('user-1', request)
    await controller.createUserSubscription('user-1', input, request)
    await controller.updateSubscription('subscription-1', input, request)
    await controller.cancelSubscription('subscription-1', input, request)
    await controller.createUserCreditCard('user-1', input, request)
    await controller.updateCreditCard('card-1', input, request)
    await controller.cancelCreditCard('card-1', input, request)
    await controller.updateCreditCardBalance('card-1', input, request)

    expect(service.getUserBudgetMonthPeriodForCurrentUser).toHaveBeenNthCalledWith(1, requestUser.id, 'user-1', {
      month: 7,
      year: 2026
    })
    expect(service.listSubscriptionsForCurrentUser).toHaveBeenCalledWith(requestUser.id, 'user-1', {
      fromDate: '2026-07-01',
      toDate: '2026-07-31'
    })
    expect(service.deleteSubscriptionTransactionForCurrentUser).toHaveBeenCalledWith(
      requestUser.id,
      'user-1',
      'budget-1',
      'transaction-1'
    )
  })

  it('rejects unauthorized requests and invalid route/query inputs', () => {
    const households = new HouseholdsController(service as unknown as HouseholdService)
    const users = new UserBudgetsController(service as unknown as HouseholdService)
    const invalidRequest = { headers: {} } as unknown as AuthenticatedRequest

    expect(() => households.dashboard('household-1', invalidRequest)).toThrow(UnauthorizedException)
    expect(() => households.dashboard('', request)).toThrow(BadRequestException)
    expect(() => households.updateBudgetCategory('household-1', '', {} as never, request)).toThrow(BadRequestException)
    expect(() => households.reorderBudgetCategory('household-1', 'category-1', 'sideways', request)).toThrow(BadRequestException)
    expect(() => households.updateCreditCard('', 'card-1', {} as never, request)).toThrow(BadRequestException)
    expect(() => households.updateCreditCard('household-1', '', {} as never, request)).toThrow(BadRequestException)
    expect(() => households.updateGoal('household-1', '', {} as never, request)).toThrow(BadRequestException)

    expect(() => users.userBudgetMonthPeriod('', '7', '2026', request)).toThrow(BadRequestException)
    expect(() => users.userBudgetMonthPeriod('user-1', '13', '2026', request)).toThrow(BadRequestException)
    expect(() => users.userBudgetMonthPeriod('user-1', '7', '1800', request)).toThrow(BadRequestException)
    expect(() => users.userSubscriptions('user-1', 'bad', '2026-07-31', request)).toThrow(BadRequestException)
    expect(() => users.userSubscriptions('user-1', '2026-07-01', 'bad', request)).toThrow(BadRequestException)
    expect(() => users.userSubscriptions('user-1', '2026-08-01', '2026-07-01', request)).toThrow(BadRequestException)
    expect(() => users.userTransactions('user-1', '', '2026-07-01', '2026-07-31', request)).toThrow(BadRequestException)
    expect(() => users.deleteSubscriptionTransaction('user-1', 'budget-1', '', request)).toThrow(BadRequestException)
    expect(() => users.updateSubscription('', {} as never, request)).toThrow(BadRequestException)
    expect(() => users.updateCreditCard('', {} as never, request)).toThrow(BadRequestException)
  })
})
