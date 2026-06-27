import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { BudgetsModule } from '../budgets/budgets.module'
import { HouseholdsModule } from '../households/households.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
import { UsersModule } from '../users/users.module'
import { BudgetSchedulerService } from './budget-scheduler.service'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BudgetsModule,
    HouseholdsModule,
    SubscriptionsModule,
    UsersModule
  ],
  providers: [
    BudgetSchedulerService
  ]
})
// Nest modules are intentionally marker classes decorated with @Module.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class BudgetSchedulerModule {}
