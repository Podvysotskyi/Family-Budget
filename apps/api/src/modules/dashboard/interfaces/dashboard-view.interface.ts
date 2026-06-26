import type { HouseholdMember } from '../../households/interfaces/household-member.interface'
import type { HouseholdSummary } from '../../households/interfaces/household-summary.interface'

export interface DashboardView {
  household: HouseholdSummary | null
  members: HouseholdMember[]
}
