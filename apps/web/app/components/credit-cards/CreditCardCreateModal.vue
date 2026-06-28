<script setup lang="ts">
import { z } from 'zod'
import type {
  CreditCardCreateFormContext,
  CreditCardFormData,
  CreditCardFormSubmitEvent,
  SaveCreditCardInput
} from '~/types/credit-cards'
import AppDatePicker from '~/components/shared/AppDatePicker.vue'

defineOptions({
  name: 'CreditCardCreateModal'
})

const householdAssignmentValue = 'household'
const creditCardsStore = useCreditCardsStore()
const { formatDateToString, getToday } = useDateUtils()
const { addErrorToast, addSuccessToast } = useAppToast()

const emit = defineEmits<{
  closed: []
  created: []
}>()

const isOpen = ref(false)
const isSaving = ref(false)
const context = ref<CreditCardCreateFormContext | null>(null)
const formData = reactive<CreditCardFormData>({
  name: '',
  userId: '',
  startDate: null,
  dueDate: null,
  limit: null
})

const assignmentOptions = computed(() => context.value?.assignmentOptions || [])
const dueDateMin = computed(() => formData.startDate || getToday())
const formSchema = computed(() => z.object({
  name: z.string().trim().min(1, 'Credit card name is required.'),
  userId: z.string().min(1, 'Assignment is required.'),
  startDate: z.preprocess(
    value => value === null ? undefined : value,
    z.date('Start date is required.')
  ),
  dueDate: z.preprocess(
    value => value === null ? undefined : value,
    z.date('Due date is required.').min(dueDateMin.value, 'Due date must be on or after the start date.')
  ),
  limit: z.preprocess(
    value => value === null ? undefined : value,
    z.number('Limit is required.').min(0.01, 'Limit must be greater than zero.')
  )
}))
const canSubmit = computed(() => Boolean(context.value?.householdId && !isSaving.value))
const isDisabled = computed(() => isSaving.value || !context.value?.householdId)

watch(() => formData.startDate, (startDate) => {
  if (startDate && formData.dueDate && formData.dueDate < startDate) {
    formData.dueDate = startDate
  }
})

function open(formContext: CreditCardCreateFormContext) {
  context.value = formContext
  resetForm()
  isOpen.value = true
  focusNameInput()
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

  context.value = null
  resetForm()
  emit('closed')
}

async function save(event: CreditCardFormSubmitEvent) {
  if (!context.value?.householdId) {
    return
  }

  isSaving.value = true

  try {
    const input: SaveCreditCardInput = {
      name: event.data.name.trim(),
      userId: getCreditCardUserId(event.data.userId),
      startDate: formatDateToString(event.data.startDate),
      dueDate: formatDateToString(event.data.dueDate),
      limit: event.data.limit
    }

    if (input.userId) {
      await creditCardsStore.createUserCreditCard(input.userId, input)
    } else {
      await creditCardsStore.createHouseholdCreditCard(context.value.householdId, input)
    }

    addSuccessToast('Credit card created.')
    emit('created')
    close(true)
  } catch {
    addErrorToast('Credit card could not be created.')
  } finally {
    isSaving.value = false
  }
}

function resetForm() {
  formData.name = ''
  formData.userId = context.value?.defaultUserId || ''
  formData.startDate = getToday()
  formData.dueDate = getToday()
  formData.limit = null
}

function getCreditCardUserId(formUserId: string) {
  if (!context.value?.hasMultipleMembers) {
    return context.value?.currentUserId || null
  }

  return formUserId === householdAssignmentValue ? null : formUserId
}

function focusNameInput() {
  if (import.meta.client) {
    nextTick(() => document.getElementById('credit-card-create-name')?.focus())
  }
}

defineExpose({
  close,
  open
})
</script>

<template>
  <UModal
    :open="isOpen"
    title="New credit card"
    :close="false"
    :dismissible="false"
    @close="handleClose"
    @update:open="(value: boolean) => !value && close()"
  >
    <template #body>
      <UForm
        id="credit-card-create-form"
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
            id="credit-card-create-name"
            v-model="formData.name"
            class="w-full"
            placeholder="Sapphire Preferred"
            :disabled="isDisabled"
          />
        </UFormField>

        <UFormField
          label="Assignment"
          name="userId"
          required
        >
          <USelect
            id="credit-card-create-assignment"
            v-model="formData.userId"
            class="w-full"
            :items="assignmentOptions"
            :disabled="isDisabled"
          />
        </UFormField>

        <UFormField
          label="Start date"
          name="startDate"
          required
        >
          <AppDatePicker
            id="credit-card-create-start-date"
            v-model="formData.startDate"
            empty-label="Select start date"
            :disabled="isDisabled"
          />
        </UFormField>

        <UFormField
          label="Due date"
          name="dueDate"
          required
        >
          <AppDatePicker
            id="credit-card-create-due-date"
            v-model="formData.dueDate"
            empty-label="Select due date"
            :min="dueDateMin"
            :disabled="isDisabled"
          />
        </UFormField>

        <UFormField
          label="Limit"
          name="limit"
          required
        >
          <UInput
            id="credit-card-create-limit"
            v-model.nullable="formData.limit"
            class="w-full"
            icon="i-lucide-dollar-sign"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            :disabled="isDisabled"
          />
        </UFormField>
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
          label="Create credit card"
          type="submit"
          form="credit-card-create-form"
          :disabled="!canSubmit"
          :loading="isSaving"
        />
      </div>
    </template>
  </UModal>
</template>
