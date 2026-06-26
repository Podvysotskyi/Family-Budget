export interface HouseholdMember {
  userId: string
  name?: string | null
  email: string
  avatarUrl?: string | null
  joinedAt: Date
}
