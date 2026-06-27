import type { DataSourceOptions } from 'typeorm'
import { BudgetCategoryEntity } from '../budget-categories/entities/budget-category.entity'
import { BudgetEntity } from '../budgets/entities/budget.entity'
import { HouseholdEntity } from '../households/entities/household.entity'
import { IncomeEntity } from '../income/entities/income.entity'
import { IncomeTypeEntity } from '../income-types/entities/income-type.entity'
import { SubscriptionTransactionEntity } from '../subscriptions/entities/subscription-transaction.entity'
import { SubscriptionEntity } from '../subscriptions/entities/subscription.entity'
import { UserEntity } from '../users/entities/user.entity'
import type { DatabaseConfigDto } from './dto/database-config.dto'

export const databaseEntities = [
  BudgetCategoryEntity,
  BudgetEntity,
  HouseholdEntity,
  IncomeEntity,
  IncomeTypeEntity,
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
