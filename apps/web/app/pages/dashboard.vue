<script setup lang="ts">
defineOptions({
  name: 'DashboardPage'
})

definePageMeta({
  middleware: 'auth'
})

const dashboardStore = useDashboardStore()
await dashboardStore.fetchDashboard()

if (!dashboardStore.error && dashboardStore.household) {
  await navigateTo(dashboardStore.members.length > 1 ? '/budget/household' : '/budget')
}
</script>

<template>
  <div class="min-h-screen" />
</template>
