import type { DataSourceOptions } from 'typeorm'
import { BudgetIncomeEntity } from '../budget-income/entities/budget-income.entity'
import { BudgetCategoryEntity } from '../budget-categories/entities/budget-category.entity'
import { BudgetEntity } from '../budgets/entities/budget.entity'
import { HouseholdEntity } from '../households/entities/household.entity'
import { IncomeTypeEntity } from '../income-types/entities/income-type.entity'
import { UserEntity } from '../users/entities/user.entity'
import type { DatabaseConfigDto } from './dto/database-config.dto'

export const databaseEntities = [
  BudgetIncomeEntity,
  BudgetCategoryEntity,
  BudgetEntity,
  HouseholdEntity,
  IncomeTypeEntity,
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
