import type { Household } from '~/types/households'

export type DashboardMember = {
  userId: string
  name?: string | null
  email: string
  avatarUrl?: string | null
  joinedAt?: string
}

export type DashboardShell = {
  user: {
    id: string
    email: string
    name?: string | null
  }
  household: Household | null
  members: DashboardMember[]
}
