export type CreditCardBalanceFormData = {
  date: Date
  balance: number | undefined
}

export type CreditCardBalanceSubmitData = {
  date: Date
  balance: number
}

export type CreditCardBalanceSubmitEvent = {
  data: CreditCardBalanceSubmitData
}
