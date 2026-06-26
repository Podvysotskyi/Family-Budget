import { Controller, Get, Inject, Req } from '@nestjs/common'
import type { AuthenticatedRequest } from '../auth/request-user'
import { requireRequestUser } from '../auth/request-user'
import { DashboardService } from './dashboard.service'

@Controller('dashboard')
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly dashboardService: DashboardService) {}

  @Get()
  async dashboard(@Req() request: AuthenticatedRequest) {
    const user = requireRequestUser(request)
    const dashboard = await this.dashboardService.getDashboard({
      userId: user.id
    })

    return {
      user,
      ...dashboard
    }
  }
}
