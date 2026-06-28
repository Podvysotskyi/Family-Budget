export type GoalTargetType = 'monthly' | 'weekly' | 'total'

export type GoalTarget = {
  id: string
  date: string
  type: GoalTargetType
  amount: number
}

export type Goal = {
  id: string
  householdId: string
  name: string
  userId: string | null
  user: {
    userId: string
    name?: string | null
    email: string
    avatarUrl?: string | null
  } | null
  startDate: string
  endDate: string | null
  includeInBudget: boolean
  currentTarget: GoalTarget | null
  targets: GoalTarget[]
  transactionCount: number
  canDeletePermanently: boolean
  createdAt: string
  updatedAt: string
}

export type SaveGoalInput = {
  name: string
  userId: string | null
  startDate: string
  endDate: string | null
  includeInBudget: boolean
  targetType: GoalTargetType
  targetAmount: number
}
