export type CreditCardLimit = {
  id: string
  date: string
  limit: number
}

export type CreditCardBalance = {
  id: string
  date: string
  balance: number
}

export type CreditCard = {
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
  dueDate: string
  currentBalance: number | null
  currentLimit: number | null
  balances: CreditCardBalance[]
  limits: CreditCardLimit[]
  createdAt: string
  updatedAt: string
}

export type SaveCreditCardInput = {
  name: string
  userId: string | null
  startDate?: string
  dueDate: string
  limit: number
}

export type CreditCardFormData = {
  name: string
  userId: string
  startDate: Date | null
  dueDate: Date | null
  limit: number | null
}

export type CreditCardFormSubmitData = {
  name: string
  userId: string
  startDate: Date
  dueDate: Date
  limit: number
}

export type CreditCardFormSubmitEvent = {
  data: CreditCardFormSubmitData
}

export type CreditCardCreateFormSubmitData = {
  name: string
  startDate: Date
  dueDate: Date
  limit: number
}

export type CreditCardCreateFormSubmitEvent = {
  data: CreditCardCreateFormSubmitData
}

export type CancelCreditCardInput = {
  effectiveDate: string
}

export type CreditCardCancellationFormData = {
  effectiveDate: Date | null
}

export type CreditCardCancellationSubmitData = {
  effectiveDate: Date
}

export type CreditCardCancellationSubmitEvent = {
  data: CreditCardCancellationSubmitData
}

export type UpdateCreditCardBalanceInput = {
  date: string
  balance: number
}
