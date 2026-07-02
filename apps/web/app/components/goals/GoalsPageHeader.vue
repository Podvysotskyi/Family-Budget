<script setup lang="ts">
import GoalCreateModal from '~/components/goals/GoalCreateModal.vue'

defineOptions({
  name: 'GoalsPageHeader'
})

defineProps<{
  isLoading: boolean
  hasHousehold: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()

const goalCreateModal = ref<InstanceType<typeof GoalCreateModal> | null>(null)

function createGoal() {
  goalCreateModal.value?.open()
}
</script>

<template>
  <div class="mb-5 flex flex-col gap-3 border-b border-default pb-3 sm:flex-row sm:items-center sm:justify-between">
    <div class="min-w-0">
      <h1 class="text-base font-semibold text-highlighted">
        Goals
      </h1>
    </div>

    <div class="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-auto">
      <UButton
        icon="i-lucide-plus"
        label="New goal"
        :disabled="isLoading || !hasHousehold"
        @click="createGoal"
      />
    </div>

    <GoalCreateModal
      ref="goalCreateModal"
      @created="emit('refresh')"
    />
  </div>
</template>
