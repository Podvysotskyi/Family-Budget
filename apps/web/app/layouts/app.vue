<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

defineOptions({
  name: 'AppLayout'
})

type DashboardShell = {
  user: {
    id: string
    email: string
    name?: string | null
  }
  household: {
    householdId: string
    householdName: string
  } | null
  members: Array<{
    userId: string
    name?: string | null
    email: string
  }>
}

const route = useRoute()
const signOut = useSignOut()
const open = ref(true)
const { data } = await useApiFetch<DashboardShell>('/dashboard')
const householdSettingsPath = '/settings'
const budgetCategoriesSettingsPath = '/settings/budget-categories'
const incomeTypesSettingsPath = '/settings/income-types'
const householdBudgetPath = '/household/budget'
const defaultBudgetUserId = computed(() => {
  return data.value?.members.find(member => member.userId === data.value?.user.id)?.userId
    || data.value?.members[0]?.userId
    || data.value?.user.id
    || ''
})
const userBudgetPath = computed(() => defaultBudgetUserId.value ? `/users/${defaultBudgetUserId.value}/budget` : householdBudgetPath)
const navigationItems = computed<NavigationMenuItem[]>(() => {
  return [
    {
      label: 'Budgets',
      icon: 'i-lucide-wallet-cards',
      to: userBudgetPath.value,
      active: route.path.startsWith('/users/')
    },
    {
      label: 'Household budget',
      icon: 'i-lucide-house',
      to: householdBudgetPath,
      active: route.path === '/dashboard' || route.path === householdBudgetPath
    },
    {
      label: 'Settings',
      icon: 'i-lucide-settings',
      defaultOpen: route.path.startsWith('/settings'),
      active: route.path.startsWith('/settings'),
      children: [
        {
          label: 'Household',
          icon: 'i-lucide-home',
          to: householdSettingsPath,
          active: route.path === householdSettingsPath
        },
        {
          label: 'Budget categories',
          icon: 'i-lucide-list-tree',
          to: budgetCategoriesSettingsPath,
          active: route.path === budgetCategoriesSettingsPath
        },
        {
          label: 'Income types',
          icon: 'i-lucide-banknote-arrow-down',
          to: incomeTypesSettingsPath,
          active: route.path === incomeTypesSettingsPath
        }
      ]
    }
  ]
})
const pageTitle = computed(() => {
  if (route.path === '/dashboard') {
    return 'Household budget'
  }

  if (route.path === '/household/budget') {
    return 'Household budget'
  }

  if (route.path === '/settings') {
    return 'Household'
  }

  if (route.path === '/settings/budget-categories') {
    return 'Budget categories'
  }

  if (route.path === '/settings/income-types') {
    return 'Income types'
  }

  if (route.path.startsWith('/users/')) {
    return 'Budget'
  }

  return 'Family Budget'
})
</script>

<template>
  <div class="flex min-h-screen flex-1">
    <USidebar
      v-model:open="open"
      collapsible="icon"
      :ui="{
        container: 'h-full'
      }"
    >
      <template #header>
        <div class="flex min-w-0 items-center gap-3 px-1">
          <div class="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-inverted">
            <UIcon
              name="i-lucide-wallet-cards"
              class="size-5"
            />
          </div>
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-highlighted">
              Family Budget
            </p>
            <p class="truncate text-xs text-muted">
              {{ data?.household?.householdName || 'Household' }}
            </p>
          </div>
        </div>
      </template>

      <UNavigationMenu
        :items="navigationItems"
        orientation="vertical"
        :ui="{ link: 'p-1.5 overflow-hidden' }"
      />
    </USidebar>

    <div class="flex min-w-0 flex-1 flex-col overflow-hidden bg-default">
      <header class="flex h-(--ui-header-height) shrink-0 items-center justify-between gap-3 border-b border-default px-4">
        <div class="flex min-w-0 items-center gap-3">
          <UButton
            icon="i-lucide-panel-left"
            color="neutral"
            variant="ghost"
            aria-label="Toggle sidebar"
            @click="open = !open"
          />
          <p class="truncate text-sm font-semibold text-highlighted">
            {{ pageTitle }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <UColorModeButton />
          <UButton
            icon="i-lucide-log-out"
            color="neutral"
            variant="ghost"
            aria-label="Sign out"
            @click="signOut"
          />
        </div>
      </header>

      <main class="min-h-0 flex-1 overflow-auto bg-muted/20">
        <slot />
      </main>

      <footer class="flex shrink-0 flex-col gap-2 border-t border-default px-4 py-3 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          Family Budget
        </p>
        <p>
          Private household workspace
        </p>
      </footer>
    </div>
  </div>
</template>
