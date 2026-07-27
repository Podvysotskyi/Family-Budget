import { describe, expect, it, vi } from 'vitest'
import { BudgetCategoriesRepository } from '../../src/modules/budget-categories/budget-categories.repository'
import type { BudgetCategoryEntity } from '../../src/modules/budget-categories/entities/budget-category.entity'
import { asRepository, createFluentQuery } from './support/typeorm-mocks'

describe('BudgetCategoriesRepository', () => {
  it('lists and creates categories after calculating the next order', async () => {
    const category = createCategory()
    const query = createFluentQuery({
      getRawOne: vi.fn().mockResolvedValue({ maxOrder: '4' })
    })
    const orm = {
      create: vi.fn(() => category),
      createQueryBuilder: vi.fn(() => query),
      find: vi.fn().mockResolvedValue([category]),
      save: vi.fn().mockResolvedValue(category)
    }
    const repository = new BudgetCategoriesRepository(asRepository<BudgetCategoryEntity>(orm))

    await expect(repository.listByHouseholdId(category.householdId)).resolves.toEqual([category])
    await expect(repository.create(category.householdId, 'Travel')).resolves.toBe(category)
    expect(orm.create).toHaveBeenCalledWith({
      householdId: category.householdId,
      inSummary: true,
      name: 'Travel',
      type: null,
      order: 5
    })
  })

  it('updates only custom category names', async () => {
    const category = createCategory()
    const orm = {
      findOne: vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...category, type: 'bills' })
        .mockResolvedValueOnce(category),
      merge: vi.fn(),
      save: vi.fn().mockResolvedValue(category)
    }
    const repository = new BudgetCategoriesRepository(asRepository<BudgetCategoryEntity>(orm))

    await expect(repository.updateName(category.householdId, 'missing', 'Travel')).resolves.toBe('not-found')
    await expect(repository.updateName(category.householdId, category.id, 'Travel')).resolves.toBe('protected')
    await expect(repository.updateName(category.householdId, category.id, 'Travel')).resolves.toBe(category)
    expect(orm.merge).toHaveBeenCalledWith(category, { name: 'Travel' })
  })

  it('reorders categories when a neighbor exists and keeps boundary categories unchanged', async () => {
    const category = createCategory()
    const neighbor = { ...createCategory(), id: 'category-2', order: 1 }
    const manager = {
      transaction: vi.fn(async (callback: (value: { update: ReturnType<typeof vi.fn> }) => Promise<void>) => {
        await callback({ update: vi.fn().mockResolvedValue(undefined) })
      })
    }
    const orm = {
      findOne: vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(category)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(category)
        .mockResolvedValueOnce(neighbor),
      findOneByOrFail: vi.fn().mockResolvedValue(category),
      manager
    }
    const repository = new BudgetCategoriesRepository(asRepository<BudgetCategoryEntity>(orm))

    await expect(repository.reorder(category.householdId, 'missing', 'up')).resolves.toBeNull()
    await expect(repository.reorder(category.householdId, category.id, 'up')).resolves.toBe(category)
    await expect(repository.reorder(category.householdId, category.id, 'down')).resolves.toBe(category)
    expect(manager.transaction).toHaveBeenCalledOnce()
    expect(orm.findOneByOrFail).toHaveBeenCalledWith({ id: category.id })
  })

  it('protects system categories and compacts ordering after deleting custom categories', async () => {
    const category = createCategory()
    const query = createFluentQuery({ execute: vi.fn().mockResolvedValue(undefined) })
    const manager = {
      createQueryBuilder: vi.fn(() => query),
      delete: vi.fn().mockResolvedValue(undefined),
      transaction: vi.fn(async (callback: (value: typeof manager) => Promise<void>) => callback(manager))
    }
    const orm = {
      findOne: vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...category, type: 'goals' })
        .mockResolvedValueOnce(category),
      manager
    }
    const repository = new BudgetCategoriesRepository(asRepository<BudgetCategoryEntity>(orm))

    await expect(repository.delete(category.householdId, 'missing')).resolves.toBe('not-found')
    await expect(repository.delete(category.householdId, category.id)).resolves.toBe('protected')
    await expect(repository.delete(category.householdId, category.id)).resolves.toBe('deleted')
    expect(manager.delete).toHaveBeenCalled()
    expect(query.execute).toHaveBeenCalledTimes(2)
  })
})

function createCategory() {
  return {
    id: 'category-1',
    householdId: 'household-1',
    name: 'Custom',
    type: null,
    inSummary: true,
    order: 2
  } as BudgetCategoryEntity
}
