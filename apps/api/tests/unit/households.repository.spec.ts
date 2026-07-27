import { describe, expect, it, vi } from 'vitest'
import type { HouseholdEntity } from '../../src/modules/households/entities/household.entity'
import { HouseholdsRepository } from '../../src/modules/households/households.repository'
import { asRepository } from './support/typeorm-mocks'

describe('HouseholdsRepository', () => {
  it('creates a household with default categories and income types in one transaction', async () => {
    const household = { id: 'household-1', name: 'Home' }
    const manager = {
      create: vi.fn((_, value: object) => value),
      save: vi.fn()
        .mockResolvedValueOnce(household)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
      transaction: vi.fn(async (callback: (value: typeof manager) => Promise<unknown>) => callback(manager))
    }
    const repository = new HouseholdsRepository(asRepository<HouseholdEntity>({ manager }))

    await expect(repository.create({ name: 'Home' })).resolves.toBe(household)
    expect(manager.transaction).toHaveBeenCalledOnce()
    expect(manager.save).toHaveBeenCalledTimes(3)
    expect(manager.create).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        householdId: household.id,
        order: 1
      })
    )
  })

  it('lists household ids', async () => {
    const orm = {
      find: vi.fn().mockResolvedValue([{ id: 'household-1' }, { id: 'household-2' }])
    }
    const repository = new HouseholdsRepository(asRepository<HouseholdEntity>(orm))

    await expect(repository.listIds()).resolves.toEqual(['household-1', 'household-2'])
    expect(orm.find).toHaveBeenCalledWith({ select: { id: true } })
  })

  it('updates an existing name and returns null for a missing household', async () => {
    const household = { id: 'household-1', name: 'Home' }
    const orm = {
      findOne: vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(household),
      merge: vi.fn(),
      save: vi.fn().mockResolvedValue(household)
    }
    const repository = new HouseholdsRepository(asRepository<HouseholdEntity>(orm))

    await expect(repository.updateName('missing', 'Name')).resolves.toBeNull()
    await expect(repository.updateName(household.id, 'Updated')).resolves.toBe(household)
    expect(orm.merge).toHaveBeenCalledWith(household, { name: 'Updated' })
  })
})
