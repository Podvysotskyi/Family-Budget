import { Inject, Injectable } from '@nestjs/common'
import { UsersRepository } from '../users/users.repository'
import type { GetDashboardDto } from './dto/get-dashboard.dto'
import type { DashboardView } from './interfaces/dashboard-view.interface'

@Injectable()
export class DashboardService {
  constructor(
    @Inject(UsersRepository) private readonly usersRepository: UsersRepository
  ) {}

  async getDashboard(input: GetDashboardDto): Promise<DashboardView> {
    const household = await this.usersRepository.findHouseholdByUserId(input.userId)
    const members = household
      ? await this.usersRepository.listByHouseholdId(household.householdId)
      : []

    return {
      household: household || null,
      members
    }
  }
}
