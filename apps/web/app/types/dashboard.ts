export type DashboardShell = {
  user: {
    id: string
    email: string
    name?: string | null
  }
  household: {
    householdId: string
    householdName: string
    joinedAt?: string
  } | null
  members: Array<{
    userId: string
    name?: string | null
    email: string
    avatarUrl?: string | null
    joinedAt?: string
  }>
}
