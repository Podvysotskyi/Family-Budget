<script setup lang="ts">
import type { Goal, GoalTargetType } from '~/types/goals'
import GoalCloseModal from '~/components/goals/GoalCloseModal.vue'
import GoalEditModal from '~/components/goals/GoalEditModal.vue'
import { useAuthStore } from '~/stores/auth'

defineOptions({
  name: 'GoalsPageListItem'
})

const authStore = useAuthStore()
const { formatCurrency } = useCurrencyUtils()
const { formatDateString, getTodayDateString } = useDateUtils()

const props = defineProps<{
  goal: Goal
}>()

const emit = defineEmits<{
  refresh: []
}>()

const goalCloseModal = ref<InstanceType<typeof GoalCloseModal> | null>(null)
const goalEditModal = ref<InstanceType<typeof GoalEditModal> | null>(null)

const canEditGoal = computed<boolean>(() => !props.goal.user || props.goal.user.userId === authStore.userId)
const isClosedGoal = computed<boolean>(() => Boolean(props.goal.endDate && props.goal.endDate < getTodayDateString()))
const canUpdateGoal = computed<boolean>(() => canEditGoal.value && !isClosedGoal.value)
const assignmentLabel = computed<string>(() => props.goal.user?.name || 'Household')

function editGoal() {
  if (!canUpdateGoal.value) {
    return
  }

  goalEditModal.value?.open(props.goal)
}

function closeGoal() {
  if (!canUpdateGoal.value) {
    return
  }

  goalCloseModal.value?.open(props.goal)
}

function formatTargetType(type: GoalTargetType | undefined) {
  if (type === 'weekly') {
    return 'Weekly'
  }

  if (type === 'total') {
    return 'Total'
  }

  return 'Monthly'
}
</script>

<template>
  <div>
    <div class="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_10rem_auto] md:items-center">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <p class="truncate text-sm font-medium text-highlighted">
            {{ goal.name }}
          </p>
          <UBadge
            color="neutral"
            variant="subtle"
            :label="assignmentLabel"
          />
          <UBadge
            v-if="goal.includeInBudget"
            color="primary"
            variant="subtle"
            label="Budget"
          />
          <UBadge
            v-if="isClosedGoal"
            color="warning"
            variant="subtle"
            label="Closed"
          />
        </div>
        <p class="mt-1 text-sm text-muted">
          {{ formatDateString(goal.startDate) }} - {{ formatDateString(goal.endDate, 'No end date') }}
        </p>
        <p class="mt-1 text-xs text-muted">
          Target effective {{ formatDateString(goal.currentTarget?.date || null) }} · {{ goal.transactionCount }} transactions
        </p>
      </div>

      <div class="min-w-0 md:text-right">
        <p class="text-xs font-medium uppercase text-muted">
          Target
        </p>
        <p class="mt-1 text-sm font-medium text-highlighted">
          {{ formatCurrency(goal.currentTarget?.amount ?? null, 'No target') }}
        </p>
        <p class="mt-1 text-xs text-muted">
          {{ formatTargetType(goal.currentTarget?.type) }}
        </p>
      </div>

      <div
        v-if="canUpdateGoal"
        class="flex items-center gap-1"
      >
        <UButton
          icon="i-lucide-pencil"
          color="neutral"
          variant="ghost"
          aria-label="Edit goal"
          @click="editGoal"
        />
        <UButton
          icon="i-lucide-archive"
          color="warning"
          variant="ghost"
          aria-label="Close goal"
          @click="closeGoal"
        />
      </div>
    </div>

    <GoalEditModal
      ref="goalEditModal"
      @saved="emit('refresh')"
    />

    <GoalCloseModal
      ref="goalCloseModal"
      @saved="emit('refresh')"
    />
  </div>
</template>
