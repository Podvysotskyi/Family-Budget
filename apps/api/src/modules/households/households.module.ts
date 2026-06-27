import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BudgetCategoriesModule } from '../budget-categories/budget-categories.module'
import { BudgetsModule } from '../budgets/budgets.module'
import { CreditCardsModule } from '../credit-cards/credit-cards.module'
import { GoalsModule } from '../goals/goals.module'
import { IncomeModule } from '../income/income.module'
import { IncomeTypesModule } from '../income-types/income-types.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
import { UsersModule } from '../users/users.module'
import { HouseholdEntity } from './entities/household.entity'
import { HouseholdsController } from './households.controller'
import { HouseholdsRepository } from './households.repository'
import { HouseholdService } from './households.service'
import { UserBudgetsController } from './user-budgets.controller'

@Module({
  imports: [
    BudgetCategoriesModule,
    BudgetsModule,
    CreditCardsModule,
    GoalsModule,
    IncomeModule,
    IncomeTypesModule,
    SubscriptionsModule,
    UsersModule,
    TypeOrmModule.forFeature([
      HouseholdEntity
    ])
  ],
  controllers: [
    HouseholdsController,
    UserBudgetsController
  ],
  providers: [
    HouseholdsRepository,
    HouseholdService
  ],
  exports: [
    HouseholdsRepository
  ]
})
// Nest modules are intentionally marker classes decorated with @Module.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class HouseholdsModule {}
