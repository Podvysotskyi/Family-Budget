import { describe, expect, it, vi } from 'vitest'
import { AuthService } from '../../src/modules/auth/auth.service'
import type { HouseholdsRepository } from '../../src/modules/households/households.repository'
import type { UsersRepository } from '../../src/modules/users/users.repository'

describe('AuthService', () => {
  it('creates a household and user for a new Google profile', async () => {
    const usersRepository = {
      findByEmail: vi.fn().mockResolvedValue(null),
      createFromGoogleProfile: vi.fn().mockResolvedValue({ id: 'user-1' })
    }
    const householdsRepository = {
      create: vi.fn().mockResolvedValue({ id: 'household-1' })
    }
    const service = new AuthService(
      usersRepository as unknown as UsersRepository,
      householdsRepository as unknown as HouseholdsRepository
    )
    const profile = {
      email: 'person@example.com',
      googleId: 'google-1',
      name: 'Person',
      avatarUrl: null
    }

    await expect(service.signInWithGoogle(profile)).resolves.toEqual({ id: 'user-1' })
    expect(householdsRepository.create).toHaveBeenCalledWith({
      name: 'Person\'s Household'
    })
    expect(usersRepository.createFromGoogleProfile).toHaveBeenCalledWith(profile, 'household-1')
  })

  it('updates an existing user without creating another household', async () => {
    const existingUser = { id: 'user-1', householdId: 'household-1' }
    const usersRepository = {
      findByEmail: vi.fn().mockResolvedValue(existingUser),
      updateGoogleProfile: vi.fn().mockResolvedValue(existingUser)
    }
    const householdsRepository = {
      create: vi.fn()
    }
    const service = new AuthService(
      usersRepository as unknown as UsersRepository,
      householdsRepository as unknown as HouseholdsRepository
    )

    await expect(service.signInWithGoogle({
      email: 'person@example.com',
      googleId: 'google-1',
      name: 'Person',
      avatarUrl: null
    })).resolves.toBe(existingUser)
    expect(householdsRepository.create).not.toHaveBeenCalled()
  })
})
