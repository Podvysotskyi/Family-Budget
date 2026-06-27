import { BudgetCategoryType } from './entities/budget-category.entity'

export const defaultBudgetCategories = [
  {
    name: 'Subscriptions',
    type: BudgetCategoryType.Subscriptions
  },
  {
    name: 'Bills',
    type: BudgetCategoryType.Bills
  },
  {
    name: 'Investment / Savings',
    type: BudgetCategoryType.Goals
  },
  {
    name: 'Credit Cards',
    type: BudgetCategoryType.CreditCards
  },
  {
    name: 'Other',
    type: BudgetCategoryType.Other
  }
] as const
