<script setup lang="ts">
defineOptions({
  name: 'UserBudgetPage'
})

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})

const route = useRoute()
const budgetUserId = computed(() => String(route.params.id))
const isHouseholdBudgetAlias = computed(() => budgetUserId.value === 'household')

if (isHouseholdBudgetAlias.value) {
  await navigateTo({
    path: '/household/budget',
    query: route.query
  })
}
</script>

<template>
  <BudgetWorkspace
    v-if="!isHouseholdBudgetAlias"
    :budget-user-id="budgetUserId"
    title="User budget"
  />
</template>
