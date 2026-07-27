import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBudgetCategoriesStore } from '../../app/stores/budget-categories'
import { useIncomeTypesStore } from '../../app/stores/income-types'
import { household, resetStoreHarness } from './support/store-harness'

const mocks = vi.hoisted(() => ({
  deleteRequest: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn()
}))

mockNuxtImport('useStoreApi', () => () => ({
  delete: mocks.deleteRequest,
  get: mocks.get,
  patch: mocks.patch,
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

describe('household reference-data stores', () => {
  beforeEach(resetStoreHarness)

  it('manages budget categories and income types, including synthetic defaults', async () => {
    const categories = useBudgetCategoriesStore()
    const apiCategory = {
      id: 'category-1',
      householdId: household.householdId,
      name: 'Bills',
      type: 'bills' as const,
      order: 1,
      includeInSummary: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01'
    }
    mocks.get.mockResolvedValue({ categories: [apiCategory] })
    await categories.fetchCategories(household.householdId)
    expect(categories.getCategories(household.householdId)).toHaveLength(3)
    expect(categories.isLoading(household.householdId)).toBe(false)
    categories.updateCategorySummaryInclusion(household.householdId, 'frontend-default-goals', true)
    expect(categories.getCategories(household.householdId).find(item => item.type === 'goals')?.includeInSummary).toBe(true)
    categories.updateCategorySummaryInclusion(household.householdId, apiCategory.id, false)
    expect(categories.getCategories(household.householdId)[0]?.includeInSummary).toBe(true)
    await categories.createCategory(household.householdId, 'Other')
    await categories.updateCategory(household.householdId, apiCategory.id, 'Updated')
    await categories.reorderCategory(household.householdId, apiCategory.id, 'up')
    await categories.deleteCategory(household.householdId, apiCategory.id)
    expect(mocks.patch).toHaveBeenCalledTimes(2)
    expect(mocks.deleteRequest).toHaveBeenCalled()

    const incomeTypes = useIncomeTypesStore()
    const salary = {
      id: 'income-type-1',
      householdId: household.householdId,
      text: 'Salary',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01'
    }
    mocks.get.mockResolvedValue({ incomeTypes: [salary] })
    await incomeTypes.fetchIncomeTypes(household.householdId)
    expect(incomeTypes.getIncomeTypes(household.householdId)).toEqual([salary])
    mocks.post.mockResolvedValueOnce({
      incomeType: { ...salary, id: 'income-type-2', text: 'Bonus' }
    })
    await incomeTypes.createIncomeType(household.householdId, 'Bonus')
    expect(incomeTypes.getIncomeTypes(household.householdId)[0]?.text).toBe('Bonus')
    await incomeTypes.updateIncomeType(household.householdId, salary.id, 'Wages')
    await incomeTypes.deleteIncomeType(household.householdId, salary.id)
  })

  it('records category and income-type loading failures', async () => {
    const categories = useBudgetCategoriesStore()
    mocks.get.mockRejectedValueOnce(new Error('offline'))
    await categories.fetchCategories(household.householdId)
    expect(categories.getError(household.householdId)).toBe('Budget categories could not be loaded')
    await categories.fetchCategories('')

    const incomeTypes = useIncomeTypesStore()
    mocks.get.mockRejectedValueOnce(new Error('offline'))
    await incomeTypes.fetchIncomeTypes(household.householdId)
    expect(incomeTypes.getError(household.householdId)).toBe('Income types could not be loaded')
    await incomeTypes.fetchIncomeTypes('')
  })
})
