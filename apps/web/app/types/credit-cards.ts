export type CreditCard = {
  id: string
  name: string
  user: {
    userId: string
    name: string
    email: string
    avatarUrl?: string | null
  } | null
  startDate: string
  endDate: string | null
  dueDate: string
  currentBalance: number | null
  currentLimit: number | null
}

export type SaveCreditCardInput = {
  name: string
  userId: string | null
  startDate?: string
  dueDate: string
  limit: number
}

export type CreateCreditCardInput = SaveCreditCardInput & {
  balance: number
}

export type CreditCardCreateFormData = {
  name: string
  startDate: Date | null
  dueDate: Date | null
  limit: number | null
  balance: number | null
}

export type CreditCardEditFormData = {
  name: string
  userId: string
  dueDate: Date | null
  limit: number | null
}

export type CreditCardEditFormSubmitData = {
  name: string
  userId: string
  dueDate: Date
  limit: number
}

export type CreditCardEditFormSubmitEvent = {
  data: CreditCardEditFormSubmitData
}

export type CreditCardCreateFormSubmitData = {
  name: string
  startDate: Date
  dueDate: Date
  limit: number
  balance: number
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
