export type CreditCardUpdateBalanceFormData = {
  date: Date | null
  balance: number | null
}

export type CreditCardUpdateBalanceSubmitData = {
  date: Date
  balance: number
}

export type CreditCardUpdateBalanceSubmitEvent = {
  data: CreditCardUpdateBalanceSubmitData
}
