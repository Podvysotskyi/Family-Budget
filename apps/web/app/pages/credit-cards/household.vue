<script setup lang="ts">
import CreditCardsPageShell from '~/components/credit-cards/CreditCardsPageShell.vue'

defineOptions({
  name: 'HouseholdCreditCardsPage'
})

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})

const dashboardStore = useDashboardStore()
await dashboardStore.fetchDashboard()

if (dashboardStore.members.length <= 1) {
  await navigateTo('/credit-cards')
}
</script>

<template>
  <CreditCardsPageShell credit-card-user-id="household" />
</template>
