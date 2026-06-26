import type { BudgetType } from '../entities/budget-type'

export class EnsureBudgetDto {
  householdId!: string
  type!: BudgetType
  startDate!: string
  endDate!: string
}
