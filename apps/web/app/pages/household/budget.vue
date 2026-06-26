<script setup lang="ts">
defineOptions({
  name: 'HouseholdBudgetPage'
})

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})
</script>

<template>
  <BudgetWorkspace
    budget-user-id="household"
    title="Household budget"
    :show-user-navigation="false"
  />
</template>
