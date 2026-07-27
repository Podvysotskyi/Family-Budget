import { describe, expect, it, vi } from 'vitest'
import type { IncomeEntity } from '../../src/modules/income/entities/income.entity'
import { IncomeRepository } from '../../src/modules/income/income.repository'
import { asRepository, createFluentQuery } from './support/typeorm-mocks'

describe('IncomeRepository', () => {
  it('creates and queries user and household income', async () => {
    const income = { id: 'income-1' }
    const query = createFluentQuery({ getMany: vi.fn().mockResolvedValue([income]) })
    const orm = {
      create: vi.fn(() => income),
      createQueryBuilder: vi.fn(() => query),
      find: vi.fn().mockResolvedValue([income]),
      save: vi.fn().mockResolvedValue(income)
    }
    const repository = new IncomeRepository(asRepository<IncomeEntity>(orm))
    const input = {
      amount: 100,
      date: '2026-07-01',
      incomeTypeId: 'income-type-1',
      userId: 'user-1'
    }

    await expect(repository.create(input)).resolves.toBe(income)
    await expect(repository.listByUserIdAndDateRange('user-1', '2026-07-01', '2026-07-31')).resolves.toEqual([income])
    await expect(repository.listByHouseholdIdAndDateRange(
      'household-1',
      '2026-07-01',
      '2026-07-31'
    )).resolves.toEqual([income])
    expect(query.innerJoin).toHaveBeenCalledWith(
      'income.user',
      'user',
      'user.household_id = :householdId',
      { householdId: 'household-1' }
    )
    expect(query.getMany).toHaveBeenCalled()
  })
})
