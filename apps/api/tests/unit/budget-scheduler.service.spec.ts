import type { DataSource } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { BudgetSchedulerService } from '../../src/modules/budget-scheduler/budget-scheduler.service'
import type { BudgetsRepository } from '../../src/modules/budgets/budgets.repository'
import { BudgetType } from '../../src/modules/budgets/entities/budget-type'
import type { HouseholdsRepository } from '../../src/modules/households/households.repository'
import { SubscriptionType } from '../../src/modules/subscriptions/entities/subscription-type'
import type { SubscriptionEntity } from '../../src/modules/subscriptions/entities/subscription.entity'
import type { SubscriptionsRepository } from '../../src/modules/subscriptions/subscriptions.repository'
import type { UsersRepository } from '../../src/modules/users/users.repository'

type MockRepository = Record<string, Mock>

const assignedSubscription = {
  id: 'subscription-1',
  householdId: 'household-1',
  userId: 'user-1',
  name: 'Streaming',
  type: SubscriptionType.Monthly,
  startDate: '2026-01-15',
  endDate: null,
  autopay: true,
  amounts: [
    { subscriptionId: 'subscription-1', date: '2026-01-15', amount: 10 },
    { subscriptionId: 'subscription-1', date: '2026-07-01', amount: 20 }
  ]
} as SubscriptionEntity
const budgets = [
  {
    id: 'month-budget',
    householdId: 'household-1',
    type: BudgetType.Month,
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    isActive: true
  },
  {
    id: 'week-budget',
    householdId: 'household-1',
    type: BudgetType.Week,
    startDate: '2026-07-20',
    endDate: '2026-07-26',
    isActive: true
  }
]

describe('BudgetSchedulerService', () => {
  let originalEnabled: string | undefined
  let originalTimeZone: string | undefined
  let budgetsRepository: MockRepository
  let dataSource: { query: Mock }
  let householdsRepository: MockRepository
  let subscriptionsRepository: MockRepository
  let usersRepository: MockRepository
  let service: BudgetSchedulerService

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-26T17:00:00.000Z'))
    originalEnabled = process.env.SCHEDULING_ENABLED
    originalTimeZone = process.env.SCHEDULING_TIMEZONE
    delete process.env.SCHEDULING_ENABLED
    process.env.SCHEDULING_TIMEZONE = 'America/Chicago'

    budgetsRepository = repositoryMock({
      ensureBudgets: 2,
      syncActiveStates: 3,
      listByHouseholdIdAndDate: budgets
    })
    dataSource = {
      query: vi.fn().mockImplementation((sql: string) => {
        return Promise.resolve(sql.includes('pg_try_advisory_lock')
          ? [{ locked: true }]
          : [])
      })
    }
    householdsRepository = repositoryMock({
      listIds: ['household-1']
    })
    subscriptionsRepository = repositoryMock({
      ensureNextSubscriptionDates: 2,
      listAutopayDueByDate: [assignedSubscription],
      createSubscriptionTransaction: { id: 'transaction-1' }
    })
    usersRepository = repositoryMock({
      listByHouseholdId: [{ userId: 'fallback-user' }]
    })
    service = new BudgetSchedulerService(
      budgetsRepository as unknown as BudgetsRepository,
      dataSource as unknown as DataSource,
      householdsRepository as unknown as HouseholdsRepository,
      subscriptionsRepository as unknown as SubscriptionsRepository,
      usersRepository as unknown as UsersRepository
    )
  })

  afterEach(() => {
    restoreEnvironment('SCHEDULING_ENABLED', originalEnabled)
    restoreEnvironment('SCHEDULING_TIMEZONE', originalTimeZone)
    vi.useRealTimers()
  })

  it('runs startup scheduling and the individual synchronization jobs', async () => {
    await service.onApplicationBootstrap()
    await service.syncActiveBudgetPeriods()
    await service.ensureCurrentSubscriptionDates()

    expect(householdsRepository.listIds).toHaveBeenCalled()
    expect(budgetsRepository.syncActiveStates).toHaveBeenCalledWith('2026-07-26')
    expect(subscriptionsRepository.ensureNextSubscriptionDates).toHaveBeenCalledWith('2026-07-26')
    expect(dataSource.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_unlock($1)',
      [42_202_601]
    )
  })

  it('skips work when scheduling is disabled or another process owns the lock', async () => {
    process.env.SCHEDULING_ENABLED = 'false'
    await service.ensureBudgetHorizon()
    expect(householdsRepository.listIds).not.toHaveBeenCalled()

    process.env.SCHEDULING_ENABLED = 'true'
    dataSource.query.mockResolvedValueOnce([{ locked: false }])
    await service.ensureBudgetHorizon()
    expect(householdsRepository.listIds).not.toHaveBeenCalled()
  })

  it('prevents overlapping local runs and releases the advisory lock after failure', async () => {
    let releaseOperation: (() => void) | undefined
    householdsRepository.listIds.mockImplementationOnce(() => new Promise<string[]>((resolve) => {
      releaseOperation = () => resolve(['household-1'])
    }))

    const firstRun = service.ensureBudgetHorizon()
    await vi.waitFor(() => expect(dataSource.query).toHaveBeenCalled())
    await service.ensureBudgetHorizon()
    expect(householdsRepository.listIds).toHaveBeenCalledTimes(1)

    releaseOperation?.()
    await firstRun

    householdsRepository.listIds.mockRejectedValueOnce(new Error('database unavailable'))
    await expect(service.ensureBudgetHorizon()).resolves.toBeUndefined()
    expect(dataSource.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock($1)', [42_202_601])
  })

  it('creates autopay transactions with effective amounts and assigned users', async () => {
    await service.processSubscriptionAutopay()

    expect(budgetsRepository.ensureBudgets).toHaveBeenCalled()
    expect(subscriptionsRepository.createSubscriptionTransaction).toHaveBeenCalledWith({
      amount: 20,
      date: '2026-07-26',
      subscriptionId: assignedSubscription.id,
      userId: 'user-1'
    })
  })

  it('uses and caches a household fallback user for unassigned subscriptions', async () => {
    const unassigned = {
      ...assignedSubscription,
      id: 'subscription-2',
      userId: null,
      amounts: [{ subscriptionId: 'subscription-2', date: '2026-01-01', amount: 15 }]
    }
    subscriptionsRepository.listAutopayDueByDate.mockResolvedValueOnce([
      unassigned,
      { ...unassigned, id: 'subscription-3' }
    ])

    await service.processSubscriptionAutopay()

    expect(usersRepository.listByHouseholdId).toHaveBeenCalledTimes(1)
    expect(subscriptionsRepository.createSubscriptionTransaction).toHaveBeenCalledTimes(2)
    expect(subscriptionsRepository.createSubscriptionTransaction).toHaveBeenLastCalledWith(
      expect.objectContaining({ userId: 'fallback-user' })
    )
  })

  it('skips invalid autopay candidates and continues after item failures', async () => {
    const unassigned = {
      ...assignedSubscription,
      id: 'subscription-without-user',
      userId: null
    }
    const withoutAmount = {
      ...assignedSubscription,
      id: 'subscription-without-amount',
      amounts: []
    }
    usersRepository.listByHouseholdId.mockResolvedValueOnce([])
    subscriptionsRepository.listAutopayDueByDate.mockResolvedValueOnce([
      unassigned,
      withoutAmount
    ])
    budgetsRepository.listByHouseholdIdAndDate
      .mockResolvedValueOnce(budgets)
      .mockResolvedValueOnce([])

    await expect(service.processSubscriptionAutopay()).resolves.toBeUndefined()
    expect(subscriptionsRepository.createSubscriptionTransaction).not.toHaveBeenCalled()
  })
})

function repositoryMock(values: Record<string, unknown>): MockRepository {
  return Object.fromEntries(
    Object.entries(values).map(([method, value]) => [method, vi.fn().mockResolvedValue(value)])
  )
}

function restoreEnvironment(name: string, value: string | undefined) {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, name)
  } else {
    process.env[name] = value
  }
}
