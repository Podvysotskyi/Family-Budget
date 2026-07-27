import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'

export function resetStoreHarness() {
  setActivePinia(createPinia())
  vi.clearAllMocks()
}

export const user = {
  id: 'user-1',
  email: 'person@example.com',
  name: 'Person',
  avatarUrl: null
}
export const household = {
  householdId: 'household-1',
  householdName: 'Home'
}
export const member = {
  userId: user.id,
  name: user.name,
  email: user.email,
  avatarUrl: null
}
export const creditCard = {
  id: 'card-1',
  name: 'Rewards',
  user: null,
  startDate: '2026-01-01',
  endDate: null,
  dueDate: '2026-01-20',
  currentBalance: 100,
  currentLimit: 1000
}
export const subscription = {
  id: 'subscription-1',
  name: 'Streaming',
  user: null,
  type: 'monthly' as const,
  startDate: '2026-01-15',
  endDate: null,
  nextChargeDate: '2026-07-15',
  amount: 20,
  autopay: true
}
export const goal = {
  id: 'goal-1',
  householdId: household.householdId,
  name: 'Emergency fund',
  userId: null,
  user: null,
  startDate: '2026-01-01',
  endDate: null,
  includeInBudget: true,
  currentTarget: {
    id: 'target-1',
    date: '2026-01-01',
    type: 'monthly' as const,
    amount: 500
  },
  targets: [],
  transactionCount: 0,
  canDeletePermanently: true,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01'
}
