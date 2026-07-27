import { describe, expect, it, vi } from 'vitest'
import type { IncomeTypeEntity } from '../../src/modules/income-types/entities/income-type.entity'
import { IncomeTypesRepository } from '../../src/modules/income-types/income-types.repository'
import { asRepository } from './support/typeorm-mocks'

describe('IncomeTypesRepository', () => {
  it('lists, creates, finds, updates, and deletes household income types', async () => {
    const incomeType = { id: 'income-type-1', householdId: 'household-1', text: 'Salary' }
    const orm = {
      create: vi.fn(() => incomeType),
      delete: vi.fn()
        .mockResolvedValueOnce({ affected: 1 })
        .mockResolvedValueOnce({ affected: 0 }),
      find: vi.fn().mockResolvedValue([incomeType]),
      findOne: vi.fn()
        .mockResolvedValueOnce(incomeType)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(incomeType),
      merge: vi.fn(),
      save: vi.fn().mockResolvedValue(incomeType)
    }
    const repository = new IncomeTypesRepository(asRepository<IncomeTypeEntity>(orm))

    await expect(repository.listByHouseholdId('household-1')).resolves.toEqual([incomeType])
    await expect(repository.create('household-1', 'Salary')).resolves.toBe(incomeType)
    await expect(repository.findByIdAndHouseholdId(incomeType.id, 'household-1')).resolves.toBe(incomeType)
    await expect(repository.updateText('household-1', 'missing', 'Other')).resolves.toBeNull()
    await expect(repository.updateText('household-1', incomeType.id, 'Paycheck')).resolves.toBe(incomeType)
    expect(orm.merge).toHaveBeenCalledWith(incomeType, { text: 'Paycheck' })
    await expect(repository.delete('household-1', incomeType.id)).resolves.toBe(true)
    await expect(repository.delete('household-1', 'missing')).resolves.toBe(false)
  })
})
