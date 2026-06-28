export type BudgetCategory = {
  id: string
  householdId: string
  name: string
  type: 'subscriptions' | 'bills' | 'credit_cards' | 'goals' | 'other' | null
  order: number
  createdAt: string
  updatedAt: string
}
