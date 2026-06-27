import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BudgetEntity } from '../../api/src/modules/budgets/entities/budget.entity'
import { BudgetsRepository } from '../../api/src/modules/budgets/budgets.repository'
import { createDatabaseOptions } from '../../api/src/modules/database/database.config'
import { HouseholdEntity } from '../../api/src/modules/households/entities/household.entity'
import { HouseholdsRepository } from '../../api/src/modules/households/households.repository'
import { BudgetSubscriptionTransactionEntity } from '../../api/src/modules/subscriptions/entities/budget-subscription-transaction.entity'
import { SubscriptionTransactionEntity } from '../../api/src/modules/subscriptions/entities/subscription-transaction.entity'
import { SubscriptionEntity } from '../../api/src/modules/subscriptions/entities/subscription.entity'
import { SubscriptionsRepository } from '../../api/src/modules/subscriptions/subscriptions.repository'
import { UserEntity } from '../../api/src/modules/users/entities/user.entity'
import { UsersRepository } from '../../api/src/modules/users/users.repository'
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
      BudgetSubscriptionTransactionEntity,
      HouseholdEntity,
      SubscriptionEntity,
      SubscriptionTransactionEntity,
      UserEntity
    ])
  ],
  providers: [
    BudgetSchedulerService,
    BudgetsRepository,
    HouseholdsRepository,
    SubscriptionsRepository,
    UsersRepository
  ]
})
// Nest modules are intentionally marker classes decorated with @Module.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppModule {}
