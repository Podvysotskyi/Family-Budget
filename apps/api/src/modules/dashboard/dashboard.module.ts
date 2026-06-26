import { Module } from '@nestjs/common'
import { HouseholdsModule } from '../households/households.module'
import { UsersModule } from '../users/users.module'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'

@Module({
  imports: [
    HouseholdsModule,
    UsersModule
  ],
  controllers: [
    DashboardController
  ],
  providers: [
    DashboardService
  ]
})
// Nest modules are intentionally marker classes decorated with @Module.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class DashboardModule {}
