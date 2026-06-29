<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

defineOptions({
  name: 'CreditCardsPageHeader'
})

const props = defineProps<{
  userId: string | null
}>()

const authStore = useAuthStore()
const householdStore = useHouseholdStore()

const emit = defineEmits<{
  createCreditCard: []
}>()

const isLoading = computed<boolean>(() => !householdStore.isLoaded || !authStore.isLoaded)
const householdSelected = computed<boolean>(() => props.userId === null)
const authUserSelected = computed<boolean>(() => props.userId === authStore.userId)
const hasMultipleMembers = computed<boolean>(() => householdStore.membersCount > 1)
const canCreateCreditCard = computed<boolean>(() => {
  return householdSelected.value || authUserSelected.value
})

const navigationItems = computed<NavigationMenuItem[]>(() => {
  return [
    ...(hasMultipleMembers.value
      ? [{
          label: 'Household',
          icon: householdSelected.value ? 'i-lucide-circle-dot' : 'i-lucide-circle',
          to: '/credit-cards',
          active: householdSelected.value
        }]
      : []),
    ...householdStore.members.map(member => ({
      label: member.name || 'Household member',
      icon: member.userId === props.userId ? 'i-lucide-circle-dot' : 'i-lucide-circle',
      to: `/credit-cards/${encodeURIComponent(member.userId)}`,
      active: member.userId === props.userId
    }))
  ]
})

if (import.meta.client && !householdStore.isLoaded) {
  void householdStore.fetchHousehold()
}
</script>

<template>
  <div class="mb-5 flex flex-col gap-3 border-b border-default pb-3 sm:flex-row sm:items-center sm:justify-between">
    <div
      class="min-w-0 overflow-x-auto"
    >
      <div
        v-if="isLoading"
        class="flex h-8 items-center gap-2"
        aria-hidden="true"
      >
        <USkeleton class="h-8 w-24 rounded-md" />
      </div>

      <UNavigationMenu
        v-else
        :items="navigationItems"
        orientation="horizontal"
        :ui="{ link: 'whitespace-nowrap' }"
      />
    </div>

    <div class="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-auto">
      <UButton
        v-if="!isLoading && canCreateCreditCard"
        icon="i-lucide-plus"
        label="New credit card"
        @click="emit('createCreditCard')"
      />
    </div>
  </div>
</template>
