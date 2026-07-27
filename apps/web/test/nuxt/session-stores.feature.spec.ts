import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '../../app/stores/auth'
import { useDashboardStore } from '../../app/stores/dashboard'
import { useHouseholdStore } from '../../app/stores/household'
import { household, member, resetStoreHarness, user } from './support/store-harness'

const mocks = vi.hoisted(() => ({
  addErrorToast: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn()
}))

mockNuxtImport('useStoreApi', () => () => ({
  get: mocks.get,
  patch: mocks.patch,
  post: mocks.post
}))
mockNuxtImport('useAppToast', () => () => ({
  addErrorToast: mocks.addErrorToast,
  addSuccessToast: vi.fn()
}))
mockNuxtImport('useAbortController', () => () => ({
  createAbortController: (store: { abortController: AbortController | null }) => {
    store.abortController?.abort()
    const controller = new AbortController()
    store.abortController = controller
    return controller
  }
}))

describe('session and household stores', () => {
  beforeEach(resetStoreHarness)

  it('handles authentication, dashboard, and household success paths', async () => {
    const auth = useAuthStore()
    mocks.get.mockResolvedValueOnce({ user })
    await expect(auth.checkSession()).resolves.toBe(true)
    expect(auth.userId).toBe(user.id)
    expect(auth.isLoaded).toBe(true)
    await expect(auth.checkSession()).resolves.toBe(true)
    mocks.post.mockRejectedValueOnce(new Error('offline'))
    await auth.signOut()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()

    const dashboard = useDashboardStore()
    mocks.get.mockResolvedValueOnce({ user, household, members: [member] })
    await dashboard.fetchDashboard()
    expect(dashboard.householdId).toBe(household.householdId)
    expect(dashboard.householdName).toBe(household.householdName)
    expect(dashboard.defaultBudgetUserId).toBe(user.id)
    await dashboard.fetchDashboard()
    mocks.patch.mockResolvedValueOnce({
      household: { ...household, householdName: 'Updated Home' }
    })
    await dashboard.updateHouseholdName('Updated Home')
    expect(dashboard.householdName).toBe('Updated Home')

    const householdStore = useHouseholdStore()
    mocks.get.mockResolvedValueOnce({ household, members: [member] })
    await householdStore.fetchHousehold()
    expect(householdStore.isLoaded).toBe(true)
    expect(householdStore.membersCount).toBe(1)
    await householdStore.fetchHousehold()
    mocks.patch.mockResolvedValueOnce({
      household: { ...household, householdName: 'Saved Home' }
    })
    await expect(householdStore.updateHouseholdName('Saved Home')).resolves.toBe(true)
    expect(householdStore.householdName).toBe('Saved Home')
  })

  it('records authentication, dashboard, and household failures', async () => {
    const auth = useAuthStore()
    mocks.get.mockRejectedValueOnce(new Error('unauthorized'))
    await expect(auth.checkSession({ force: true })).resolves.toBe(false)
    expect(auth.error).toBe('Session check failed')

    const dashboard = useDashboardStore()
    mocks.get.mockRejectedValueOnce(new Error('offline'))
    await dashboard.fetchDashboard({ force: true })
    expect(dashboard.error).toBe('Dashboard could not be loaded')
    await expect(dashboard.updateHouseholdName('Name')).rejects.toThrow('Household is required')

    const householdStore = useHouseholdStore()
    expect(await householdStore.updateHouseholdName('Name')).toBe(false)
    mocks.get.mockRejectedValueOnce(new Error('offline'))
    await householdStore.fetchHousehold(true)
    expect(mocks.addErrorToast).toHaveBeenCalledWith('Household could not be loaded')
    householdStore.household = household
    mocks.patch.mockRejectedValueOnce(new Error('offline'))
    await expect(householdStore.updateHouseholdName('Name')).resolves.toBe(false)
    expect(mocks.addErrorToast).toHaveBeenCalledWith('Household name could not be saved')
  })
})
