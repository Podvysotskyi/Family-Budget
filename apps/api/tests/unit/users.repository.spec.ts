import { describe, expect, it, vi } from 'vitest'
import type { UserEntity } from '../../src/modules/users/entities/user.entity'
import { UsersRepository } from '../../src/modules/users/users.repository'
import { asRepository } from './support/typeorm-mocks'

describe('UsersRepository', () => {
  it('creates and looks up users through scoped repository queries', async () => {
    const entity = createUser()
    const orm = {
      create: vi.fn(() => entity),
      findOne: vi.fn().mockResolvedValue(entity),
      save: vi.fn().mockResolvedValue(entity)
    }
    const repository = new UsersRepository(asRepository<UserEntity>(orm))

    await expect(repository.findByEmail(entity.email)).resolves.toBe(entity)
    expect(orm.findOne).toHaveBeenLastCalledWith({ where: { email: entity.email } })
    await expect(repository.findByHouseholdIdAndUserId(entity.householdId, entity.id)).resolves.toBe(entity)
    expect(orm.findOne).toHaveBeenLastCalledWith({
      where: { id: entity.id, householdId: entity.householdId }
    })

    await expect(repository.createFromGoogleProfile({
      email: entity.email,
      googleId: 'google-1',
      name: ' Person ',
      avatarUrl: ''
    }, entity.householdId)).resolves.toBe(entity)
    expect(orm.create).toHaveBeenCalledWith({
      email: entity.email,
      googleId: 'google-1',
      name: 'Person',
      avatarUrl: null,
      householdId: entity.householdId
    })
  })

  it('updates Google and household data and handles missing users', async () => {
    const entity = createUser()
    const orm = {
      findOne: vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(entity)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(entity),
      merge: vi.fn(),
      save: vi.fn().mockResolvedValue(entity)
    }
    const repository = new UsersRepository(asRepository<UserEntity>(orm))
    const profile = {
      email: entity.email,
      googleId: 'google-2',
      name: 'Updated',
      avatarUrl: 'avatar.png'
    }

    await expect(repository.updateGoogleProfile(entity.id, profile)).resolves.toBeNull()
    await expect(repository.updateGoogleProfile(entity.id, profile)).resolves.toBe(entity)
    expect(orm.merge).toHaveBeenCalledWith(entity, {
      googleId: 'google-2',
      name: 'Updated',
      avatarUrl: 'avatar.png'
    })
    await expect(repository.updateHouseholdId(entity.id, 'household-2')).resolves.toBeNull()
    await expect(repository.updateHouseholdId(entity.id, 'household-2')).resolves.toBe(entity)
    expect(orm.merge).toHaveBeenCalledWith(entity, { householdId: 'household-2' })
  })

  it('maps household, member, and budget-user views', async () => {
    const entity = createUser()
    const orm = {
      find: vi.fn().mockResolvedValue([entity]),
      findOne: vi.fn()
        .mockResolvedValueOnce(entity)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(entity)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(entity)
        .mockResolvedValueOnce(null)
    }
    const repository = new UsersRepository(asRepository<UserEntity>(orm))

    await expect(repository.findHouseholdByUserId(entity.id)).resolves.toEqual({
      householdId: entity.household.id,
      householdName: entity.household.name,
      joinedAt: entity.createdAt
    })
    await expect(repository.findHouseholdByUserId('missing')).resolves.toBeNull()
    await expect(repository.findHouseholdByHouseholdIdAndUserId(entity.householdId, entity.id)).resolves.toEqual({
      householdId: entity.household.id,
      householdName: entity.household.name,
      joinedAt: entity.createdAt
    })
    await expect(repository.findHouseholdByHouseholdIdAndUserId(entity.householdId, 'missing')).resolves.toBeNull()
    await expect(repository.listByHouseholdId(entity.householdId)).resolves.toEqual([{
      userId: entity.id,
      name: entity.name,
      email: entity.email,
      avatarUrl: entity.avatarUrl,
      joinedAt: entity.createdAt
    }])
    await expect(repository.findBudgetUserByHouseholdIdAndUserId(entity.householdId, entity.id)).resolves.toEqual({
      householdId: entity.household.id,
      householdName: entity.household.name,
      userId: entity.id,
      name: entity.name,
      email: entity.email,
      avatarUrl: entity.avatarUrl
    })
    await expect(repository.findBudgetUserByHouseholdIdAndUserId(entity.householdId, 'missing')).resolves.toBeNull()
  })
})

function createUser() {
  return {
    id: 'user-1',
    email: 'person@example.com',
    googleId: 'google-1',
    name: 'Person',
    avatarUrl: null,
    householdId: 'household-1',
    household: {
      id: 'household-1',
      name: 'Home'
    },
    createdAt: new Date('2026-01-01T00:00:00.000Z')
  } as UserEntity
}
