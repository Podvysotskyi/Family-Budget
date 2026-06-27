<script setup lang="ts">
defineOptions({
  name: 'BudgetUserPage'
})

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})

const route = useRoute()
const budgetUserId = computed(() => String(route.params.id))
</script>

<template>
  <BudgetPageShell :budget-user-id="budgetUserId" />
</template>
