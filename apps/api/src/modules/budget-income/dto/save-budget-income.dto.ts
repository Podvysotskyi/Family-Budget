export class SaveBudgetIncomeDto {
  budgetId!: string
  incomeTypeId!: string
  amount!: number
  date?: string | null
}
