import type { Household } from '~/types/households'

export type DashboardMember = {
  userId: string
  name: string
  email: string
  avatarUrl?: string | null
  joinedAt?: string
}

export type DashboardShell = {
  user: {
    id: string
    email: string
    name: string
  }
  household: Household | null
  members: DashboardMember[]
}
