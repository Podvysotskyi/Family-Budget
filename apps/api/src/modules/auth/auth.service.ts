import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common'
import { HouseholdsRepository } from '../households/households.repository'
import { UsersRepository } from '../users/users.repository'
import type { GoogleProfileDto } from './dto/google-profile.dto'

@Injectable()
export class AuthService {
  constructor(
    @Inject(UsersRepository) private readonly usersRepository: UsersRepository,
    @Inject(HouseholdsRepository) private readonly householdsRepository: HouseholdsRepository
  ) {}

  async signInWithGoogle(profile: GoogleProfileDto) {
    const existingUser = await this.usersRepository.findByEmail(profile.email)

    if (existingUser) {
      const user = await this.usersRepository.updateGoogleProfile(existingUser.id, profile)

      if (!user) {
        throw new InternalServerErrorException('Failed to save Google user')
      }

      if (user.householdId) {
        return user
      }

      const household = await this.createHouseholdForProfile(profile)
      const userWithHousehold = await this.usersRepository.updateHouseholdId(user.id, household.id)

      if (!userWithHousehold) {
        throw new InternalServerErrorException('Failed to save Google user')
      }

      return userWithHousehold
    }

    const household = await this.createHouseholdForProfile(profile)
    const user = await this.usersRepository.createFromGoogleProfile(profile, household.id)

    if (!user) {
      throw new InternalServerErrorException('Failed to save Google user')
    }

    return user
  }

  private async createHouseholdForProfile(profile: GoogleProfileDto) {
    const household = await this.householdsRepository.create({
      name: `${profile.name || profile.email}'s Household`
    })

    if (!household) {
      throw new InternalServerErrorException('Failed to create household')
    }

    return household
  }
}
