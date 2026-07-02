<script setup lang="ts">
import type { Goal } from '~/types/goals'
import GoalsPageListItem from '~/components/goals/GoalsPageListItem.vue'

defineOptions({
  name: 'GoalsPageList'
})

const props = defineProps<{
  goals: Goal[]
  isLoading: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()

const { getTodayDateString } = useDateUtils()

const showOnlyActiveGoals = ref<boolean>(true)

const filteredGoals = computed<Goal[]>(() => {
  return props.goals.filter(goal => !showOnlyActiveGoals.value || isActiveGoal(goal))
})

function isActiveGoal(goal: Goal) {
  return !goal.endDate || goal.endDate >= getTodayDateString()
}
</script>

<template>
  <section class="rounded-lg border border-default bg-default">
    <div class="flex items-center justify-between gap-3 border-b border-default px-5 py-3">
      <h2 class="text-sm font-medium text-highlighted">
        Savings and investments
      </h2>

      <USwitch
        v-model="showOnlyActiveGoals"
        label="Active only"
        :disabled="isLoading"
      />
    </div>

    <div
      v-if="isLoading"
      class="space-y-3 p-5"
    >
      <USkeleton class="h-16 w-full" />
      <USkeleton class="h-16 w-full" />
    </div>

    <div
      v-else-if="filteredGoals.length"
      class="divide-y divide-default"
    >
      <GoalsPageListItem
        v-for="goal in filteredGoals"
        :key="goal.id"
        :goal="goal"
        @refresh="emit('refresh')"
      />
    </div>

    <div
      v-else
      class="px-5 py-4 text-sm text-muted"
    >
      <template v-if="!goals.length">
        No goals found.
      </template>
      <template v-else-if="showOnlyActiveGoals">
        No active goals found.
      </template>
      <template v-else>
        No goals found.
      </template>
    </div>
  </section>
</template>
