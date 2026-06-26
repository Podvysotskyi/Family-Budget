import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import type { Repository } from 'typeorm'
import type { UpsertGoogleUserDto } from './dto/upsert-google-user.dto'
import { UserEntity } from './entities/user.entity'
import type { BudgetUser } from '../households/interfaces/budget-user.interface'
import type { HouseholdMember } from '../households/interfaces/household-member.interface'
import type { HouseholdSummary } from '../households/interfaces/household-summary.interface'

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>
  ) {}

  findByEmail(email: string) {
    return this.usersRepository.findOne({
      where: { email }
    })
  }

  findByHouseholdIdAndUserId(householdId: string, userId: string) {
    return this.usersRepository.findOne({
      where: {
        id: userId,
        householdId
      }
    })
  }

  async createFromGoogleProfile(profile: UpsertGoogleUserDto, householdId: string) {
    return this.usersRepository.save(this.usersRepository.create({
      email: profile.email,
      googleId: profile.googleId,
      name: profile.name || null,
      avatarUrl: profile.avatarUrl || null,
      householdId
    }))
  }

  async updateGoogleProfile(userId: string, profile: UpsertGoogleUserDto) {
    const user = await this.usersRepository.findOne({
      where: { id: userId }
    })

    if (!user) {
      return null
    }

    this.usersRepository.merge(user, {
      googleId: profile.googleId,
      name: profile.name || null,
      avatarUrl: profile.avatarUrl || null
    })

    return this.usersRepository.save(user)
  }

  async updateHouseholdId(userId: string, householdId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId }
    })

    if (!user) {
      return null
    }

    this.usersRepository.merge(user, { householdId })

    return this.usersRepository.save(user)
  }

  async findHouseholdByUserId(userId: string): Promise<HouseholdSummary | null> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: {
        household: true
      }
    })

    if (!user) {
      return null
    }

    return {
      householdId: user.household.id,
      householdName: user.household.name,
      joinedAt: user.createdAt
    }
  }

  async findHouseholdByHouseholdIdAndUserId(householdId: string, userId: string): Promise<HouseholdSummary | null> {
    const user = await this.usersRepository.findOne({
      where: {
        id: userId,
        householdId
      },
      relations: {
        household: true
      }
    })

    if (!user) {
      return null
    }

    return {
      householdId: user.household.id,
      householdName: user.household.name,
      joinedAt: user.createdAt
    }
  }

  async listByHouseholdId(householdId: string): Promise<HouseholdMember[]> {
    const users = await this.usersRepository.find({
      where: { householdId }
    })

    return users.map(user => ({
      userId: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      joinedAt: user.createdAt
    }))
  }

  async findBudgetUserByHouseholdIdAndUserId(householdId: string, userId: string): Promise<BudgetUser | null> {
    const user = await this.usersRepository.findOne({
      where: {
        id: userId,
        householdId
      },
      relations: {
        household: true
      }
    })

    if (!user) {
      return null
    }

    return {
      householdId: user.household.id,
      householdName: user.household.name,
      userId: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl
    }
  }
}
