import type { DataSourceOptions } from 'typeorm'
import { BudgetCategoryEntity } from '../budget-categories/entities/budget-category.entity'
import { BudgetEntity } from '../budgets/entities/budget.entity'
import { CreditCardBalanceEntity } from '../credit-cards/entities/credit-card-balance.entity'
import { CreditCardEntity } from '../credit-cards/entities/credit-card.entity'
import { CreditCardLimitEntity } from '../credit-cards/entities/credit-card-limit.entity'
import { GoalTargetEntity } from '../goals/entities/goal-target.entity'
import { GoalTransactionEntity } from '../goals/entities/goal-transaction.entity'
import { GoalEntity } from '../goals/entities/goal.entity'
import { HouseholdEntity } from '../households/entities/household.entity'
import { IncomeEntity } from '../income/entities/income.entity'
import { IncomeTypeEntity } from '../income-types/entities/income-type.entity'
import { SubscriptionAmountEntity } from '../subscriptions/entities/subscription-amount.entity'
import { SubscriptionDateEntity } from '../subscriptions/entities/subscription-date.entity'
import { SubscriptionTransactionEntity } from '../subscriptions/entities/subscription-transaction.entity'
import { SubscriptionEntity } from '../subscriptions/entities/subscription.entity'
import { UserEntity } from '../users/entities/user.entity'
import type { DatabaseConfigDto } from './dto/database-config.dto'

export const databaseEntities = [
  BudgetCategoryEntity,
  BudgetEntity,
  CreditCardBalanceEntity,
  CreditCardEntity,
  CreditCardLimitEntity,
  GoalEntity,
  GoalTargetEntity,
  GoalTransactionEntity,
  HouseholdEntity,
  IncomeEntity,
  IncomeTypeEntity,
  SubscriptionAmountEntity,
  SubscriptionDateEntity,
  SubscriptionEntity,
  SubscriptionTransactionEntity,
  UserEntity
]

export function createDatabaseOptions(config: DatabaseConfigDto): DataSourceOptions {
  return {
    type: 'postgres',
    url: config.url,
    entities: databaseEntities,
    migrations: [
      `${__dirname}/migrations/*{.ts,.js}`
    ],
    synchronize: false
  }
}
