import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BudgetEntity } from '../../api/src/modules/budgets/entities/budget.entity'
import { BudgetsRepository } from '../../api/src/modules/budgets/budgets.repository'
import { createDatabaseOptions } from '../../api/src/modules/database/database.config'
import { HouseholdEntity } from '../../api/src/modules/households/entities/household.entity'
import { HouseholdsRepository } from '../../api/src/modules/households/households.repository'
import { BudgetSchedulerService } from './modules/budget-scheduler/budget-scheduler.service'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(createDatabaseOptions({
      url: process.env.DATABASE_URL
    })),
    TypeOrmModule.forFeature([
      BudgetEntity,
      HouseholdEntity
    ])
  ],
  providers: [
    BudgetSchedulerService,
    BudgetsRepository,
    HouseholdsRepository
  ]
})
// Nest modules are intentionally marker classes decorated with @Module.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppModule {}
