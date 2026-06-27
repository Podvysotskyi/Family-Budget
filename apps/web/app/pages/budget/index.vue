<script setup lang="ts">
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
