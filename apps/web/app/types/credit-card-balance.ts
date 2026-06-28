export type CreditCardBalanceFormData = {
  date: Date | null
  balance: number | null
}

export type CreditCardBalanceSubmitData = {
  date: Date
  balance: number
}

export type CreditCardBalanceSubmitEvent = {
  data: CreditCardBalanceSubmitData
}
