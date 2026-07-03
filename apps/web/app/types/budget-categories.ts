export type BudgetCategory = {
  id: string
  householdId: string
  name: string
  type: 'subscriptions' | 'bills' | 'credit_cards' | 'goals' | 'other' | null
  order: number
  includeInSummary: boolean
  summaryInclusionEditable: boolean
  createdAt: string
  updatedAt: string
}
