<script setup lang="ts">
import type { Goal, GoalTargetType } from '~/types/goals'
import GoalCloseModal from '~/components/goals/GoalCloseModal.vue'
import GoalDeleteModal from '~/components/goals/GoalDeleteModal.vue'
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
const goalDeleteModal = ref<InstanceType<typeof GoalDeleteModal> | null>(null)
const goalEditModal = ref<InstanceType<typeof GoalEditModal> | null>(null)

const canEditGoal = computed<boolean>(() => !props.goal.user || props.goal.user.userId === authStore.userId)
const isClosedGoal = computed<boolean>(() => Boolean(props.goal.endDate && props.goal.endDate < getTodayDateString()))
const assignmentLabel = computed<string>(() => props.goal.user?.name || 'Household')

function editGoal() {
  if (!canEditGoal.value) {
    return
  }

  goalEditModal.value?.open(props.goal)
}

function closeGoal() {
  if (!canEditGoal.value || isClosedGoal.value) {
    return
  }

  goalCloseModal.value?.open(props.goal)
}

function deleteGoal() {
  if (!canEditGoal.value || !props.goal.canDeletePermanently) {
    return
  }

  goalDeleteModal.value?.open(props.goal)
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
    <div class="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
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
          {{ formatCurrency(goal.currentTarget?.amount ?? null, 'No target') }} · {{ formatTargetType(goal.currentTarget?.type) }} · {{ formatDateString(goal.startDate) }} - {{ formatDateString(goal.endDate, 'No end date') }}
        </p>
        <p class="mt-1 text-xs text-muted">
          Target effective {{ formatDateString(goal.currentTarget?.date || null) }} · {{ goal.transactionCount }} transactions
        </p>
      </div>

      <div
        v-if="canEditGoal"
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
          v-if="!isClosedGoal"
          icon="i-lucide-archive"
          color="warning"
          variant="ghost"
          aria-label="Close goal"
          @click="closeGoal"
        />
        <UButton
          v-if="goal.canDeletePermanently"
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          aria-label="Delete goal permanently"
          @click="deleteGoal"
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

    <GoalDeleteModal
      ref="goalDeleteModal"
      @saved="emit('refresh')"
    />
  </div>
</template>
