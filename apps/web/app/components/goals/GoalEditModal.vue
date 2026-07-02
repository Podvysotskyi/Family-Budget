<script setup lang="ts">
import { z } from 'zod'
import type {
  Goal,
  GoalFormData,
  GoalFormSubmitData,
  GoalFormSubmitEvent,
  GoalTargetType,
  SaveGoalInput
} from '~/types/goals'
import AppDatePicker from '~/components/shared/AppDatePicker.vue'

defineOptions({
  name: 'GoalEditModal'
})

const authStore = useAuthStore()
const goalsStore = useGoalsStore()
const householdStore = useHouseholdStore()
const { formatDateToString, getToday, parseDateString } = useDateUtils()
const { addErrorToast, addSuccessToast } = useAppToast()

const emit = defineEmits<{
  closed: []
  saved: []
}>()

const householdAssignmentValue = 'household'
const hasMultipleMembers = computed<boolean>(() => householdStore.membersCount > 1)
const defaultUserId = computed<string>(() => authStore.userId || householdStore.members[0]?.userId || '')
const targetTypeOptions: { label: string, value: GoalTargetType }[] = [
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

const isOpen = ref<boolean>(false)
const selectedGoal = ref<Goal | null>(null)
const isSaving = ref<boolean>(false)
const formData = reactive<GoalFormData>({
  name: '',
  userId: '',
  startDate: null,
  endDate: null,
  includeInBudget: true,
  targetType: 'monthly',
  targetAmount: null
})

const assignmentOptions = computed<{ label: string, value: string }[]>(() => {
  return [
    ...(hasMultipleMembers.value
      ? [{
          label: 'Household',
          value: householdAssignmentValue
        }]
      : []),
    ...(authStore.user
      ? [{
          label: authStore.user.name,
          value: authStore.user.id
        }]
      : [])
  ]
})
const endDateMin = computed<Date>(() => formData.startDate || getToday())
const formSchema = computed<z.ZodType<GoalFormSubmitData>>(() => z.object({
  name: z.string().trim().min(1, 'Goal name is required.'),
  userId: z.string(),
  startDate: z.preprocess(
    value => value === null ? undefined : value,
    z.date('Start date is required.')
  ),
  endDate: z
    .date()
    .nullable()
    .refine(value => !value || value >= endDateMin.value, 'End date must be on or after the start date.'),
  includeInBudget: z.boolean(),
  targetType: z.enum(['monthly', 'weekly', 'total']),
  targetAmount: z.preprocess(
    value => value === null ? undefined : value,
    z.number('Target amount is required.').min(0.01, 'Target amount must be greater than zero.')
  )
}))

watch(() => formData.startDate, (startDate) => {
  if (startDate && formData.endDate && formData.endDate < startDate) {
    formData.endDate = startDate
  }
})

function open(goal: Goal) {
  selectedGoal.value = goal
  resetForm(goal)
  isOpen.value = true
}

function close(force = false) {
  if (isSaving.value && !force) {
    return
  }

  isOpen.value = false
}

function handleClose() {
  if (isOpen.value) {
    return
  }

  selectedGoal.value = null
  resetForm()
  emit('closed')
}

async function save(event: GoalFormSubmitEvent) {
  if (!selectedGoal.value || !householdStore.householdId) {
    return
  }

  isSaving.value = true

  try {
    const input: SaveGoalInput = {
      name: event.data.name.trim(),
      userId: event.data.userId === householdAssignmentValue ? null : event.data.userId,
      startDate: formatDateToString(event.data.startDate),
      endDate: event.data.endDate ? formatDateToString(event.data.endDate) : null,
      includeInBudget: event.data.includeInBudget,
      targetType: event.data.targetType,
      targetAmount: event.data.targetAmount
    }

    await goalsStore.updateGoal(householdStore.householdId, selectedGoal.value.id, input)
    addSuccessToast('Goal saved.')
    emit('saved')
    close(true)
  } catch {
    addErrorToast('Goal could not be saved.')
  } finally {
    isSaving.value = false
  }
}

function resetForm(goal?: Goal) {
  formData.name = goal?.name || ''
  formData.userId = goal?.user?.userId || (hasMultipleMembers.value ? householdAssignmentValue : defaultUserId.value)
  formData.startDate = goal ? parseDateString(goal.startDate) : null
  formData.endDate = goal?.endDate ? parseDateString(goal.endDate) : null
  formData.includeInBudget = goal?.includeInBudget ?? true
  formData.targetType = goal?.currentTarget?.type || 'monthly'
  formData.targetAmount = goal?.currentTarget?.amount ?? null
}

defineExpose({
  close,
  open
})
</script>

<template>
  <UModal
    :open="isOpen"
    title="Edit goal"
    :close="false"
    :dismissible="false"
    @close="handleClose"
    @update:open="(value: boolean) => !value && close()"
  >
    <template #body>
      <UForm
        id="goal-edit-form"
        :schema="formSchema"
        :state="formData"
        class="space-y-4"
        @submit="save"
      >
        <UFormField
          label="Name"
          name="name"
          required
        >
          <UInput
            id="goal-edit-name"
            v-model="formData.name"
            class="w-full"
            placeholder="Emergency fund"
            :disabled="isSaving"
          />
        </UFormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            label="Assignment"
            name="userId"
            required
          >
            <USelect
              id="goal-edit-assignment"
              v-model="formData.userId"
              class="w-full"
              :items="assignmentOptions"
              :disabled="isSaving || !hasMultipleMembers"
            />
          </UFormField>

          <UFormField
            label="Target type"
            name="targetType"
            required
          >
            <USelect
              id="goal-edit-target-type"
              v-model="formData.targetType"
              class="w-full"
              :items="targetTypeOptions"
              :disabled="isSaving"
            />
          </UFormField>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            label="Start date"
            name="startDate"
            required
          >
            <AppDatePicker
              id="goal-edit-start-date"
              v-model="formData.startDate"
              empty-label="Select start date"
              :disabled="isSaving"
            />
          </UFormField>

          <UFormField
            label="End date"
            name="endDate"
          >
            <AppDatePicker
              id="goal-edit-end-date"
              v-model="formData.endDate"
              empty-label="No end date"
              :min="endDateMin"
              clearable
              clear-aria-label="Clear end date"
              :disabled="isSaving"
            />
          </UFormField>
        </div>

        <UFormField
          label="Target amount"
          name="targetAmount"
          required
        >
          <UInput
            id="goal-edit-target-amount"
            v-model.nullable="formData.targetAmount"
            class="w-full"
            icon="i-lucide-dollar-sign"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            :disabled="isSaving"
          />
        </UFormField>

        <div class="rounded-lg border border-default px-3 py-2">
          <USwitch
            v-model="formData.includeInBudget"
            label="Include in budget"
            :disabled="isSaving"
          />
        </div>
      </UForm>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          label="Cancel"
          :disabled="isSaving"
          @click="close()"
        />
        <UButton
          color="primary"
          label="Save goal"
          type="submit"
          form="goal-edit-form"
          :disabled="isSaving"
          :loading="isSaving"
        />
      </div>
    </template>
  </UModal>
</template>
