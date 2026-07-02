<script setup lang="ts">
import { z } from 'zod'
import type {
  GoalCreateFormData,
  GoalCreateFormSubmitData,
  GoalCreateFormSubmitEvent,
  GoalTargetType,
  SaveGoalInput
} from '~/types/goals'
import AppDatePicker from '~/components/shared/AppDatePicker.vue'

defineOptions({
  name: 'GoalCreateModal'
})

const goalsStore = useGoalsStore()
const householdStore = useHouseholdStore()
const { formatDateToString, getToday } = useDateUtils()
const { addErrorToast, addSuccessToast } = useAppToast()

const emit = defineEmits<{
  closed: []
  created: []
}>()

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
const isSaving = ref<boolean>(false)
const selectedUserId = ref<string | null>(null)
const formData = reactive<GoalCreateFormData>({
  name: '',
  startDate: null,
  endDate: null,
  includeInBudget: true,
  targetType: 'monthly',
  targetAmount: null
})

const endDateMin = computed<Date>(() => formData.startDate || getToday())
const formSchema = computed<z.ZodType<GoalCreateFormSubmitData>>(() => z.object({
  name: z.string().trim().min(1, 'Goal name is required.'),
  startDate: z.preprocess(
    value => value === null ? undefined : value,
    z.date('Start date is required.')
  ),
  endDate: z.preprocess(
    value => value === null ? null : value,
    z.date().nullable().refine(
      value => !value || value >= endDateMin.value,
      'End date must be on or after the start date.'
    )
  ),
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

function open(userId: string | null) {
  selectedUserId.value = userId
  resetForm()
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

  selectedUserId.value = null
  resetForm()
  emit('closed')
}

async function save(event: GoalCreateFormSubmitEvent) {
  if (!householdStore.householdId) {
    return
  }

  isSaving.value = true

  try {
    const input: SaveGoalInput = {
      name: event.data.name.trim(),
      userId: selectedUserId.value,
      startDate: formatDateToString(event.data.startDate),
      endDate: event.data.endDate ? formatDateToString(event.data.endDate) : null,
      includeInBudget: event.data.includeInBudget,
      targetType: event.data.targetType,
      targetAmount: event.data.targetAmount
    }

    await goalsStore.createHouseholdGoal(householdStore.householdId, input)
    addSuccessToast('Goal created.')
    emit('created')
    close(true)
  } catch {
    addErrorToast('Goal could not be created.')
  } finally {
    isSaving.value = false
  }
}

function resetForm() {
  formData.name = ''
  formData.startDate = getToday()
  formData.endDate = null
  formData.includeInBudget = true
  formData.targetType = 'monthly'
  formData.targetAmount = null
}

defineExpose({
  close,
  open
})
</script>

<template>
  <UModal
    :open="isOpen"
    title="New goal"
    :close="false"
    :dismissible="false"
    @close="handleClose"
    @update:open="(value: boolean) => !value && close()"
  >
    <template #body>
      <UForm
        id="goal-create-form"
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
            id="goal-create-name"
            v-model="formData.name"
            class="w-full"
            placeholder="Emergency fund"
            :disabled="isSaving"
          />
        </UFormField>

        <UFormField
          label="Target amount"
          name="targetAmount"
          required
        >
          <UInput
            id="goal-create-target-amount"
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

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            label="Start date"
            name="startDate"
            required
          >
            <AppDatePicker
              id="goal-create-start-date"
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
              id="goal-create-end-date"
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
          label="Target type"
          name="targetType"
          required
        >
          <USelect
            id="goal-create-target-type"
            v-model="formData.targetType"
            class="w-full"
            :items="targetTypeOptions"
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
          label="Create goal"
          type="submit"
          form="goal-create-form"
          :disabled="isSaving"
          :loading="isSaving"
        />
      </div>
    </template>
  </UModal>
</template>
