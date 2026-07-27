import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BudgetsRepository, sortBudgetPeriods, toBudgetPeriod } from '../../src/modules/budgets/budgets.repository'
import { BudgetType } from '../../src/modules/budgets/entities/budget-type'
import type { BudgetEntity } from '../../src/modules/budgets/entities/budget.entity'
import { asRepository, createFluentQuery } from './support/typeorm-mocks'

describe('BudgetsRepository', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-15T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does nothing for empty or already-existing budget inputs', async () => {
    const input = createBudget()
    const orm = {
      find: vi.fn().mockResolvedValue([input])
    }
    const repository = new BudgetsRepository(asRepository<BudgetEntity>(orm))

    await expect(repository.ensureBudgets([])).resolves.toBe(0)
    await expect(repository.ensureBudgets([input])).resolves.toBe(0)
    expect(orm.find).toHaveBeenCalledOnce()
  })

  it('inserts missing budgets with calculated active states', async () => {
    const query = createFluentQuery({
      execute: vi.fn().mockResolvedValue({ raw: [{ id: 'budget-1' }], identifiers: [] })
    })
    const orm = {
      createQueryBuilder: vi.fn(() => query),
      find: vi.fn().mockResolvedValue([])
    }
    const repository = new BudgetsRepository(asRepository<BudgetEntity>(orm))
    const active = createBudget()
    const future = createBudget({
      id: 'budget-2',
      startDate: '2026-08-01',
      endDate: '2026-08-31'
    })

    await expect(repository.ensureBudgets([active, future])).resolves.toBe(1)
    expect(query.values).toHaveBeenCalledWith([
      expect.objectContaining({ id: active.id, isActive: true }),
      expect.objectContaining({ id: future.id, isActive: false })
    ])
  })

  it('queries scoped periods and synchronizes active states', async () => {
    const budget = createBudget()
    const query = createFluentQuery({ getMany: vi.fn().mockResolvedValue([budget]) })
    const orm = {
      createQueryBuilder: vi.fn(() => query),
      find: vi.fn().mockResolvedValue([budget]),
      findOne: vi.fn().mockResolvedValue(budget),
      query: vi.fn().mockResolvedValue([{ id: budget.id }, { id: 'budget-2' }])
    }
    const repository = new BudgetsRepository(asRepository<BudgetEntity>(orm))

    await expect(repository.listByHouseholdIdAndStartDates('household-1', [budget.startDate])).resolves.toEqual([budget])
    await expect(repository.findByIdAndHouseholdId(budget.id, 'household-1')).resolves.toBe(budget)
    await expect(repository.listByHouseholdIdAndDate('household-1', '2026-07-15')).resolves.toEqual([budget])
    await expect(repository.syncActiveStates('2026-07-15')).resolves.toBe(2)
    expect(query.andWhere).toHaveBeenCalledTimes(2)
  })
})

describe('budget period mapping', () => {
  it('maps and sorts month and week periods', () => {
    const month = createBudget()
    const laterWeek = createBudget({
      id: 'week-2',
      type: BudgetType.Week,
      startDate: '2026-07-13',
      endDate: '2026-07-19'
    })
    const earlierWeek = createBudget({
      id: 'week-1',
      type: BudgetType.Week,
      startDate: '2026-07-06',
      endDate: '2026-07-12'
    })

    expect(toBudgetPeriod(month)).toEqual({
      id: month.id,
      type: month.type,
      startDate: month.startDate,
      endDate: month.endDate,
      isActive: month.isActive
    })
    expect(sortBudgetPeriods([laterWeek, month, earlierWeek]).map(period => period.id)).toEqual([
      month.id,
      earlierWeek.id,
      laterWeek.id
    ])
  })
})

function createBudget(overrides: Partial<BudgetEntity> = {}) {
  return {
    id: 'budget-1',
    householdId: 'household-1',
    type: BudgetType.Month,
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    isActive: true,
    ...overrides
  } as BudgetEntity
}
