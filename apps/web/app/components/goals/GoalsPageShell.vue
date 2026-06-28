<script setup lang="ts">
import type { Goal, GoalTargetType } from '~/types/goals'
import GoalCloseModal from '~/components/goals/GoalCloseModal.vue'
import GoalDeleteModal from '~/components/goals/GoalDeleteModal.vue'
import GoalFormModal from '~/components/goals/GoalFormModal.vue'

defineOptions({
  name: 'GoalsPageShell'
})

const householdAssignmentValue = 'household'
const dashboardStore = useDashboardStore()
const goalsStore = useGoalsStore()
const { getTodayDateString } = useDateUtils()
await dashboardStore.fetchDashboard()
const householdId = computed(() => dashboardStore.householdId)
const goals = computed(() => goalsStore.getGoals(householdId.value))
const pending = computed(() => goalsStore.isLoading(householdId.value))
const error = computed(() => goalsStore.getError(householdId.value))
const showOnlyActiveGoals = ref(true)
const goalPendingDelete = ref<Goal | null>(null)
const goalPendingPermanentDelete = ref<Goal | null>(null)
const deletingGoalId = ref<string | null>(null)
const deletionError = ref<string | null>(null)
const editingGoalId = ref<string | null>(null)
const formError = ref<string | null>(null)
const isGoalModalOpen = ref(false)
const isSavingGoal = ref(false)
const goalName = ref('')
const goalUserId = ref(getDefaultGoalUserId())
const goalStartDate = ref(getTodayDateString())
const goalEndDate = ref('')
const goalIncludeInBudget = ref(true)
const goalTargetType = ref<GoalTargetType>('monthly')
const goalTargetAmount = ref('')
const assignmentOptions = computed(() => {
  return [
    {
      label: 'Household',
      value: householdAssignmentValue
    },
    ...(dashboardStore.user
      ? [{
          label: dashboardStore.user.name || dashboardStore.user.email,
          value: dashboardStore.user.id
        }]
      : [])
  ]
})
const targetTypeOptions = [
  {
    label: 'Monthly',
    value: 'monthly'
  },
  {
    label: 'Weekly',
    value: 'weekly'
  },
  {
    label: 'Total',
    value: 'total'
  }
]
const trimmedGoalName = computed(() => goalName.value.trim())
const parsedGoalTargetAmount = computed(() => Number(goalTargetAmount.value))
const isEditingGoal = computed(() => Boolean(editingGoalId.value))
const canSaveGoal = computed(() => {
  return Boolean(!pending.value && trimmedGoalName.value && householdId.value && goalTargetAmount.value)
})
const filteredGoals = computed(() => {
  return goals.value.filter(goal => !showOnlyActiveGoals.value || isActiveGoal(goal))
})
const emptyGoalsMessage = computed(() => {
  if (!goals.value.length) {
    return 'No goals found.'
  }

  return showOnlyActiveGoals.value ? 'No active goals found.' : 'No goals found.'
})

if (householdId.value) {
  await refresh()
}

watch(householdId, async (id) => {
  if (id) {
    await refresh()
  }
})

watch(() => dashboardStore.user?.id, () => {
  if (!goalUserId.value) {
    goalUserId.value = getDefaultGoalUserId()
  }
}, { immediate: true })

async function refresh() {
  await goalsStore.fetchGoals(householdId.value)
}

function resetForm() {
  editingGoalId.value = null
  formError.value = null
  goalName.value = ''
  goalUserId.value = getDefaultGoalUserId()
  goalStartDate.value = getTodayDateString()
  goalEndDate.value = ''
  goalIncludeInBudget.value = true
  goalTargetType.value = 'monthly'
  goalTargetAmount.value = ''
}

function startCreatingGoal() {
  resetForm()
  isGoalModalOpen.value = true

  if (import.meta.client) {
    nextTick(() => document.getElementById('goal-name')?.focus())
  }
}

function closeGoalModal() {
  isGoalModalOpen.value = false
  resetForm()
}

function setGoalModalOpen(open: boolean) {
  if (open) {
    isGoalModalOpen.value = true
    return
  }

  closeGoalModal()
}

function startEditingGoal(goal: Goal) {
  formError.value = null
  editingGoalId.value = goal.id
  goalName.value = goal.name
  goalUserId.value = goal.userId || householdAssignmentValue
  goalStartDate.value = goal.startDate
  goalEndDate.value = goal.endDate || ''
  goalIncludeInBudget.value = goal.includeInBudget
  goalTargetType.value = goal.currentTarget?.type || 'monthly'
  goalTargetAmount.value = String(goal.currentTarget?.amount || '')
  isGoalModalOpen.value = true

  if (import.meta.client) {
    nextTick(() => document.getElementById('goal-name')?.focus())
  }
}

function startDeletingGoal(goal: Goal) {
  deletionError.value = null
  goalPendingDelete.value = goal
}

function startPermanentlyDeletingGoal(goal: Goal) {
  deletionError.value = null
  goalPendingPermanentDelete.value = goal
}

function closeDeletionModal() {
  goalPendingDelete.value = null
  deletionError.value = null
}

function closePermanentDeletionModal() {
  goalPendingPermanentDelete.value = null
  deletionError.value = null
}

async function saveGoal() {
  formError.value = null

  if (!householdId.value) {
    formError.value = 'Household is required.'
    return
  }

  if (!trimmedGoalName.value) {
    formError.value = 'Goal name is required.'
    return
  }

  if (!isDateString(goalStartDate.value)) {
    formError.value = 'Start date is required.'
    return
  }

  if (goalEndDate.value && goalEndDate.value < goalStartDate.value) {
    formError.value = 'End date must be on or after the start date.'
    return
  }

  if (!Number.isFinite(parsedGoalTargetAmount.value) || parsedGoalTargetAmount.value <= 0) {
    formError.value = 'Target amount must be greater than zero.'
    return
  }

  isSavingGoal.value = true

  try {
    const input = {
      name: trimmedGoalName.value,
      userId: getGoalUserId(),
      startDate: goalStartDate.value,
      endDate: goalEndDate.value || null,
      includeInBudget: goalIncludeInBudget.value,
      targetType: goalTargetType.value,
      targetAmount: parsedGoalTargetAmount.value
    }

    if (editingGoalId.value) {
      await goalsStore.updateGoal(householdId.value, editingGoalId.value, input)
    } else {
      await goalsStore.createGoal(householdId.value, input)
    }

    closeGoalModal()
  } catch {
    formError.value = editingGoalId.value ? 'Goal could not be saved.' : 'Goal could not be created.'
  } finally {
    isSavingGoal.value = false
  }
}

async function deleteGoal() {
  deletionError.value = null

  if (!goalPendingDelete.value) {
    return
  }

  if (!householdId.value) {
    deletionError.value = 'Household is required.'
    return
  }

  deletingGoalId.value = goalPendingDelete.value.id

  try {
    await goalsStore.deleteGoal(householdId.value, goalPendingDelete.value.id)
    closeDeletionModal()
  } catch {
    deletionError.value = 'Goal could not be closed.'
  } finally {
    deletingGoalId.value = null
  }
}

async function permanentlyDeleteGoal() {
  deletionError.value = null

  if (!goalPendingPermanentDelete.value) {
    return
  }

  if (!householdId.value) {
    deletionError.value = 'Household is required.'
    return
  }

  deletingGoalId.value = goalPendingPermanentDelete.value.id

  try {
    await goalsStore.permanentlyDeleteGoal(householdId.value, goalPendingPermanentDelete.value.id)
    closePermanentDeletionModal()
  } catch {
    deletionError.value = 'Goal could not be permanently deleted.'
  } finally {
    deletingGoalId.value = null
  }
}

function getGoalUserId() {
  return goalUserId.value === householdAssignmentValue ? null : goalUserId.value
}

function getDefaultGoalUserId() {
  return dashboardStore.user?.id || householdAssignmentValue
}

function getGoalAssignmentLabel(goal: Goal) {
  if (!goal.user) {
    return 'Household'
  }

  return goal.user.name || goal.user.email
}

function isActiveGoal(goal: Goal) {
  const today = getTodayDateString()

  return !goal.endDate || goal.endDate >= today
}

function isClosedGoal(goal: Goal) {
  const today = getTodayDateString()

  return Boolean(goal.endDate && goal.endDate < today)
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return 'No target'
  }

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD'
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) {
    return 'No end date'
  }

  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString(undefined, {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
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

function isDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

</script>

<template>
  <UContainer class="py-6">
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
          :disabled="pending || isSavingGoal || !householdId"
          @click="startCreatingGoal"
        />
      </div>
    </div>

    <section class="rounded-lg border border-default bg-default">
      <div class="flex items-center justify-between gap-3 border-b border-default px-5 py-3">
        <h2 class="text-sm font-medium text-highlighted">
          Savings and investments
        </h2>

        <USwitch
          v-model="showOnlyActiveGoals"
          label="Active only"
          :disabled="pending || !householdId"
        />
      </div>

      <div
        v-if="pending"
        class="space-y-3 p-5"
      >
        <USkeleton class="h-16 w-full" />
        <USkeleton class="h-16 w-full" />
      </div>

      <div
        v-else-if="error || !householdId"
        class="px-5 py-4 text-sm text-muted"
      >
        <UAlert
          color="error"
          variant="subtle"
          icon="i-lucide-database"
          title="Goals are unavailable"
          description="Check that your user has a household."
        />
      </div>

      <div
        v-else-if="filteredGoals.length"
        class="divide-y divide-default"
      >
        <div
          v-for="goal in filteredGoals"
          :key="goal.id"
          class="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between"
        >
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="truncate text-sm font-medium text-highlighted">
                {{ goal.name }}
              </p>
              <UBadge
                color="neutral"
                variant="subtle"
                :label="getGoalAssignmentLabel(goal)"
              />
              <UBadge
                v-if="goal.includeInBudget"
                color="primary"
                variant="subtle"
                label="Budget"
              />
              <UBadge
                v-if="isClosedGoal(goal)"
                color="warning"
                variant="subtle"
                label="Closed"
              />
            </div>
            <p class="mt-1 text-sm text-muted">
              {{ formatCurrency(goal.currentTarget?.amount) }} · {{ formatTargetType(goal.currentTarget?.type) }} · {{ formatDate(goal.startDate) }} - {{ formatDate(goal.endDate) }}
            </p>
            <p class="mt-1 text-xs text-muted">
              Target effective {{ formatDate(goal.currentTarget?.date || null) }} · {{ goal.transactionCount }} transactions
            </p>
          </div>

          <div class="flex items-center gap-1">
            <UButton
              icon="i-lucide-pencil"
              color="neutral"
              variant="ghost"
              aria-label="Edit goal"
              :disabled="deletingGoalId === goal.id"
              @click="startEditingGoal(goal)"
            />
            <UButton
              icon="i-lucide-archive"
              color="warning"
              variant="ghost"
              aria-label="Close goal"
              :disabled="deletingGoalId === goal.id"
              @click="startDeletingGoal(goal)"
            />
            <UButton
              v-if="goal.canDeletePermanently"
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              aria-label="Delete goal permanently"
              :disabled="deletingGoalId === goal.id"
              @click="startPermanentlyDeletingGoal(goal)"
            />
          </div>
        </div>
      </div>

      <div
        v-else
        class="px-5 py-4 text-sm text-muted"
      >
        {{ emptyGoalsMessage }}
      </div>
    </section>

    <GoalFormModal
      v-model:name="goalName"
      v-model:user-id="goalUserId"
      v-model:start-date="goalStartDate"
      v-model:end-date="goalEndDate"
      v-model:include-in-budget="goalIncludeInBudget"
      v-model:target-type="goalTargetType"
      v-model:target-amount="goalTargetAmount"
      :open="isGoalModalOpen"
      :is-editing="isEditingGoal"
      :pending="pending"
      :is-saving="isSavingGoal"
      :has-household="Boolean(householdId)"
      :form-error="formError"
      :assignment-options="assignmentOptions"
      :target-type-options="targetTypeOptions"
      :can-save="canSaveGoal"
      @update:open="setGoalModalOpen"
      @cancel="closeGoalModal"
      @save="saveGoal"
    />

    <GoalCloseModal
      :open="Boolean(goalPendingDelete)"
      :goal-name="goalPendingDelete?.name || ''"
      :is-closing="Boolean(deletingGoalId)"
      :error="deletionError"
      @update:open="(value: boolean) => !value && closeDeletionModal()"
      @confirm="deleteGoal"
    />

    <GoalDeleteModal
      :open="Boolean(goalPendingPermanentDelete)"
      :goal-name="goalPendingPermanentDelete?.name || ''"
      :is-deleting="Boolean(deletingGoalId)"
      :error="deletionError"
      @update:open="(value: boolean) => !value && closePermanentDeletionModal()"
      @confirm="permanentlyDeleteGoal"
    />
  </UContainer>
</template>
