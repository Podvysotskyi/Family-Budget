export type SubscriptionType = 'monthly' | 'yearly'

export type Subscription = {
  id: string
  name: string
  user: {
    userId: string
    name: string
    email: string
    avatarUrl?: string | null
  } | null
  type: SubscriptionType
  startDate: string
  endDate: string | null
  nextChargeDate: string | null
  amount: number
  autopay: boolean
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

export type CancelSubscriptionInput = {
  effectiveDate: string
}

export type SubscriptionCreateFormData = {
  name: string
  type: SubscriptionType
  startDate: Date | null
  dueDate: Date | null
  endDate: Date | null
  amount: number | null
  autopay: boolean
}

export type SubscriptionCreateFormSubmitData = {
  name: string
  type: SubscriptionType
  startDate: Date
  dueDate: Date
  endDate: Date | null
  amount: number
  autopay: boolean
}

export type SubscriptionCreateFormSubmitEvent = {
  data: SubscriptionCreateFormSubmitData
}

export type SubscriptionEditFormData = {
  name: string
  userId: string
  type: SubscriptionType
  nextChargeDate: Date | null
  amount: number | null
  autopay: boolean
}

export type SubscriptionEditFormSubmitData = {
  name: string
  userId: string
  type: SubscriptionType
  nextChargeDate: Date
  amount: number
  autopay: boolean
}

export type SubscriptionEditFormSubmitEvent = {
  data: SubscriptionEditFormSubmitData
}

export type SubscriptionCancellationFormData = {
  effectiveDate: Date | null
}

export type SubscriptionCancellationSubmitData = {
  effectiveDate: Date
}

export type SubscriptionCancellationSubmitEvent = {
  data: SubscriptionCancellationSubmitData
}
