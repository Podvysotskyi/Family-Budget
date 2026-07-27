import { describe, expect, it, vi } from 'vitest'
import { DashboardService } from '../../src/modules/dashboard/dashboard.service'
import type { UsersRepository } from '../../src/modules/users/users.repository'

describe('DashboardService', () => {
  it('returns a household and its members', async () => {
    const household = {
      householdId: 'household-1',
      householdName: 'Home',
      joinedAt: new Date('2026-01-01')
    }
    const members = [{ userId: 'user-1', name: 'Person' }]
    const usersRepository = {
      findHouseholdByUserId: vi.fn().mockResolvedValue(household),
      listByHouseholdId: vi.fn().mockResolvedValue(members)
    }
    const service = new DashboardService(usersRepository as unknown as UsersRepository)

    await expect(service.getDashboard({ userId: 'user-1' })).resolves.toEqual({
      household,
      members
    })
    expect(usersRepository.listByHouseholdId).toHaveBeenCalledWith(household.householdId)
  })

  it('returns an empty dashboard when the user has no household', async () => {
    const usersRepository = {
      findHouseholdByUserId: vi.fn().mockResolvedValue(null),
      listByHouseholdId: vi.fn()
    }
    const service = new DashboardService(usersRepository as unknown as UsersRepository)

    await expect(service.getDashboard({ userId: 'user-1' })).resolves.toEqual({
      household: null,
      members: []
    })
    expect(usersRepository.listByHouseholdId).not.toHaveBeenCalled()
  })
})
