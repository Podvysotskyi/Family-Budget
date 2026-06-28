<script setup lang="ts">
import BudgetPageShell from '~/components/budget/BudgetPageShell.vue'

defineOptions({
  name: 'CurrentUserBudgetPage'
})

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})
</script>

<template>
  <BudgetPageShell />
</template>
