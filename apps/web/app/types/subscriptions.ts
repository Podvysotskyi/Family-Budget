export type SubscriptionType = 'monthly' | 'yearly'

export type Subscription = {
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
  type: SubscriptionType
  startDate: string
  endDate: string | null
  nextChargeDate: string | null
  amount: number
  autopay: boolean
  createdAt: string
  updatedAt: string
}

export type SaveSubscriptionInput = {
  name: string
  userId: string | null
  type: SubscriptionType
  startDate: string
  endDate: string | null
  nextChargeDate?: string | null
  amount: number
  autopay: boolean
}
