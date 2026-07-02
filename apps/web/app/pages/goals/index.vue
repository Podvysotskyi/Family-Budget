<script setup lang="ts">
import GoalsPageHeader from '~/components/goals/GoalsPageHeader.vue'
import GoalsPageList from '~/components/goals/GoalsPageList.vue'

defineOptions({
  name: 'GoalsPage'
})

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})

const householdStore = useHouseholdStore()
const goalsStore = useGoalsStore()

const isLoading = computed<boolean>(() => householdStore.isLoading || goalsStore.isLoading)
const hasHousehold = computed<boolean>(() => Boolean(householdStore.householdId))

async function refresh() {
  await goalsStore.fetchHouseholdGoals(householdStore.householdId)
}

await householdStore.fetchHousehold()
await refresh()
</script>

<template>
  <UContainer class="py-6">
    <GoalsPageHeader
      :is-loading="isLoading"
      :has-household="hasHousehold"
      @refresh="refresh"
    />

    <GoalsPageList
      :goals="goalsStore.householdGoalList"
      :is-loading="isLoading"
      :has-household="hasHousehold"
      @refresh="refresh"
    />
  </UContainer>
</template>
