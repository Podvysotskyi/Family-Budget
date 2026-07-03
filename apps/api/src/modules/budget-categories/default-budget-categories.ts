import { BudgetCategoryType } from './entities/budget-category.entity'

export const defaultBudgetCategories = [
  {
    name: 'Subscriptions',
    inSummary: true,
    type: BudgetCategoryType.Subscriptions
  },
  {
    name: 'Bills',
    inSummary: true,
    type: BudgetCategoryType.Bills
  },
  {
    name: 'Investment / Savings',
    inSummary: false,
    type: BudgetCategoryType.Goals
  },
  {
    name: 'Credit Cards',
    inSummary: false,
    type: BudgetCategoryType.CreditCards
  },
  {
    name: 'Other',
    inSummary: true,
    type: BudgetCategoryType.Other
  }
] as const
