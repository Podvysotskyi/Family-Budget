import type { mountSuspended } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { expect, vi } from 'vitest'
import { useAuthStore } from '../../../app/stores/auth'
import { useHouseholdStore } from '../../../app/stores/household'

export const today = new Date(2026, 6, 26)
export const user = {
  id: 'user-1',
  email: 'person@example.com',
  name: 'Person',
  avatarUrl: null
}

export function resetModalHarness() {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  const authStore = useAuthStore()
  authStore.user = user
  authStore.isAuthenticated = true
  seedHouseholdStore()
}

export function seedHouseholdStore() {
  const householdStore = useHouseholdStore()
  householdStore.household = {
    householdId: 'household-1',
    householdName: 'Home'
  }
  householdStore.householdMembers = [{
    userId: user.id,
    name: user.name,
    avatarUrl: null
  }]
}

type ModalApi = {
  close: (force?: boolean) => void
  open: (value: unknown) => void
}

export function exposedModal(wrapper: Awaited<ReturnType<typeof mountSuspended>>) {
  return wrapper.vm as unknown as ModalApi
}

export async function submitForm(
  wrapper: Awaited<ReturnType<typeof mountSuspended>>,
  data: Record<string, unknown>
) {
  wrapper.findComponent({ name: 'UForm' }).vm.$emit('submit', { data })
  await nextTick()
  await vi.waitFor(() => {
    expect(wrapper.findComponent({ name: 'UForm' }).exists()).toBe(true)
  })
}
