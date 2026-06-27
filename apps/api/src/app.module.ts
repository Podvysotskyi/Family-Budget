import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './modules/auth/auth.module'
import { BudgetSchedulerModule } from './modules/budget-scheduler/budget-scheduler.module'
import { BudgetsModule } from './modules/budgets/budgets.module'
import { DashboardModule } from './modules/dashboard/dashboard.module'
import { DatabaseModule } from './modules/database/database.module'
import { HouseholdsModule } from './modules/households/households.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    DatabaseModule,
    AuthModule,
    BudgetSchedulerModule,
    BudgetsModule,
    DashboardModule,
    HouseholdsModule
  ]
})
// Nest modules are intentionally marker classes decorated with @Module.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppModule {}
