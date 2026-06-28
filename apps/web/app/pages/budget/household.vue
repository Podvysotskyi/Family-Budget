<script setup lang="ts">
import BudgetPageShell from '~/components/budget/BudgetPageShell.vue'

defineOptions({
  name: 'BudgetHouseholdPage'
})

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})

const dashboardStore = useDashboardStore()
await dashboardStore.fetchDashboard()

if (dashboardStore.members.length <= 1) {
  await navigateTo('/budget')
}
</script>

<template>
  <BudgetPageShell budget-user-id="household" />
</template>
