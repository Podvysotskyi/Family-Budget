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
    name: string
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

export type GoalFormData = {
  name: string
  userId: string
  startDate: Date | null
  endDate: Date | null
  includeInBudget: boolean
  targetType: GoalTargetType
  targetAmount: number | null
}

export type GoalFormSubmitData = {
  name: string
  userId: string
  startDate: Date
  endDate: Date | null
  includeInBudget: boolean
  targetType: GoalTargetType
  targetAmount: number
}

export type GoalFormSubmitEvent = {
  data: GoalFormSubmitData
}
