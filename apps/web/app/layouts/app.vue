<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

defineOptions({
  name: 'AppLayout'
})

const route = useRoute()
const signOut = useSignOut()
const open = ref(true)
const dashboardStore = useDashboardStore()
await dashboardStore.fetchDashboard()
const householdSettingsPath = '/settings/household'
const budgetCategoriesSettingsPath = '/settings/budget-categories'
const creditCardsPath = '/credit-cards'
const goalsPath = '/goals'
const incomeTypesSettingsPath = '/settings/income-types'
const userBudgetPath = '/budget'
const subscriptionsPath = '/subscriptions'
const navigationItems = computed<NavigationMenuItem[]>(() => {
  return [
    {
      label: 'Budget',
      icon: 'i-lucide-wallet-cards',
      to: userBudgetPath,
      active: route.path === '/budget' || /^\/budget\/(?!household(?:\/|$))/.test(route.path)
    },
    {
      label: 'Subscriptions',
      icon: 'i-lucide-repeat-2',
      to: subscriptionsPath,
      active: route.path.startsWith('/subscriptions')
    },
    {
      label: 'Credit cards',
      icon: 'i-lucide-credit-card',
      to: creditCardsPath,
      active: route.path.startsWith('/credit-cards')
    },
    {
      label: 'Goals',
      icon: 'i-lucide-piggy-bank',
      to: goalsPath,
      active: route.path.startsWith('/goals')
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
  if (route.path.startsWith('/budget')) {
    return 'Budget'
  }

  if (route.path.startsWith('/subscriptions')) {
    return 'Subscriptions'
  }

  if (route.path.startsWith('/credit-cards')) {
    return 'Credit cards'
  }

  if (route.path.startsWith('/goals')) {
    return 'Goals'
  }

  if (route.path === '/settings/budget-categories') {
    return 'Budget categories'
  }

  if (route.path === '/settings/income-types') {
    return 'Income types'
  }

  return '...'
})
</script>

<template>
  <div class="flex min-h-screen flex-1">
    <USidebar
      v-model:open="open"
      collapsible="offcanvas"
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
              {{ dashboardStore.householdName || 'Household' }}
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
            class="lg:hidden"
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
