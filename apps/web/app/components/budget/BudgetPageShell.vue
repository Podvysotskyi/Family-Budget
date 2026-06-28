<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import BudgetWorkspace from '~/components/budget/BudgetWorkspace.vue'

defineOptions({
  name: 'BudgetPageShell'
})

const props = defineProps<{
  budgetUserId?: string
}>()

const householdBudgetUserId = 'household'
const route = useRoute()
const dashboardStore = useDashboardStore()
await dashboardStore.fetchDashboard()
const selectedBudgetUserId = computed(() => {
  return props.budgetUserId || dashboardStore.defaultBudgetUserId || householdBudgetUserId
})
const selectedBudgetUser = computed(() => dashboardStore.members.find(member => member.userId === selectedBudgetUserId.value))
const budgetTitle = computed(() => {
  if (selectedBudgetUserId.value === householdBudgetUserId) {
    return 'Household budget'
  }

  const userName = selectedBudgetUser.value?.name || selectedBudgetUser.value?.email

  return userName ? `${userName} budget` : 'User budget'
})
const hasMultipleMembers = computed(() => dashboardStore.members.length > 1)
const budgetUserNavigationItems = computed<NavigationMenuItem[]>(() => [
  ...(hasMultipleMembers.value
    ? [{
        label: 'Household',
        icon: selectedBudgetUserId.value === householdBudgetUserId ? 'i-lucide-circle-dot' : 'i-lucide-circle',
        to: buildBudgetUserPath(householdBudgetUserId),
        active: selectedBudgetUserId.value === householdBudgetUserId
      }]
    : []),
  ...dashboardStore.members.map(member => ({
    label: member.name || member.email,
    icon: member.userId === selectedBudgetUserId.value ? 'i-lucide-circle-dot' : 'i-lucide-circle',
    to: buildBudgetUserPath(member.userId),
    active: member.userId === selectedBudgetUserId.value
  }))
])

function buildBudgetUserPath(userId: string) {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(route.query)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') {
          query.append(key, item)
        }
      }
      continue
    }

    if (typeof value === 'string') {
      query.set(key, value)
    }
  }

  const path = getBudgetUserPath(userId)
  const queryString = query.toString()

  return queryString ? `${path}?${queryString}` : path
}

function getBudgetUserPath(userId: string) {
  if (userId === householdBudgetUserId) {
    return '/budget/household'
  }

  if (userId === dashboardStore.defaultBudgetUserId) {
    return '/budget'
  }

  return `/budget/${encodeURIComponent(userId)}`
}
</script>

<template>
  <div>
    <UContainer class="pt-6">
      <div
        v-if="budgetUserNavigationItems.length"
        class="overflow-x-auto border-b border-default pb-3"
      >
        <UNavigationMenu
          :items="budgetUserNavigationItems"
          orientation="horizontal"
          :ui="{ link: 'whitespace-nowrap' }"
        />
      </div>
    </UContainer>

    <BudgetWorkspace
      :budget-user-id="selectedBudgetUserId"
      :title="budgetTitle"
    />
  </div>
</template>
