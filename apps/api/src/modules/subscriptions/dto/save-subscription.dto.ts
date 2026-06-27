import type { SubscriptionType } from '../entities/subscription-type'

export class SaveSubscriptionDto {
  name?: string
  userId?: string | null
  type?: SubscriptionType
  startDate?: string
  endDate?: string | null
  amount?: number
  autopay?: boolean
}
