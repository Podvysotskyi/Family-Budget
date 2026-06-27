<script setup lang="ts">
defineOptions({
  name: 'HouseholdSubscriptionsPage'
})

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})

const dashboardStore = useDashboardStore()
await dashboardStore.fetchDashboard()

if (dashboardStore.members.length <= 1) {
  await navigateTo('/subscriptions')
}
</script>

<template>
  <SubscriptionsPageShell subscription-user-id="household" />
</template>
