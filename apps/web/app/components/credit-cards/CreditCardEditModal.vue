<script setup lang="ts">
import { z } from 'zod'
import type {
  CreditCard,
  CreditCardEditFormContext,
  CreditCardFormData,
  CreditCardFormSubmitEvent,
  SaveCreditCardInput
} from '~/types/credit-cards'
import AppDatePicker from '~/components/shared/AppDatePicker.vue'

defineOptions({
  name: 'CreditCardEditModal'
})

const householdAssignmentValue = 'household'
const creditCardsStore = useCreditCardsStore()
const { formatDateToString, getToday, parseDateString } = useDateUtils()
const { addErrorToast, addSuccessToast } = useAppToast()

const isOpen = ref(false)
const selectedCreditCard = ref<CreditCard | null>(null)
const isSaving = ref(false)
const context = ref<CreditCardEditFormContext | null>(null)
const formData = reactive<CreditCardFormData>({
  name: '',
  userId: '',
  startDate: null,
  dueDate: null,
  limit: null
})

const assignmentOptions = computed(() => context.value?.assignmentOptions || [])
const dueDateMin = computed(() => selectedCreditCard.value ? parseDateString(selectedCreditCard.value.startDate) || getToday() : getToday())
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
const canSubmit = computed(() => Boolean(selectedCreditCard.value && context.value?.householdId && !isSaving.value))
const isDisabled = computed(() => isSaving.value || !context.value?.householdId)

function open(creditCard: CreditCard, formContext: CreditCardEditFormContext) {
  if (creditCard.endDate) {
    return
  }

  context.value = formContext
  selectedCreditCard.value = creditCard
  resetForm(creditCard)
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

  selectedCreditCard.value = null
  context.value = null
  resetForm()
}

async function save(event: CreditCardFormSubmitEvent) {
  if (!selectedCreditCard.value || !context.value?.householdId) {
    return
  }

  isSaving.value = true

  try {
    const input: SaveCreditCardInput = {
      name: event.data.name.trim(),
      userId: getCreditCardUserId(event.data.userId),
      dueDate: formatDateToString(event.data.dueDate),
      limit: event.data.limit,
      startDate: selectedCreditCard.value.startDate
    }

    await creditCardsStore.updateCreditCard(context.value.householdId, selectedCreditCard.value.id, input)
    addSuccessToast('Credit card saved.')
    close(true)
  } catch {
    addErrorToast('Credit card could not be saved.')
  } finally {
    isSaving.value = false
  }
}

function resetForm(creditCard?: CreditCard) {
  const latestLimit = creditCard?.limits[0]

  formData.name = creditCard?.name || ''
  formData.userId = getDefaultUserId(creditCard)
  formData.startDate = creditCard ? parseDateString(creditCard.startDate) : null
  formData.dueDate = creditCard ? parseDateString(creditCard.dueDate) : null
  formData.limit = creditCard?.currentLimit ?? latestLimit?.limit ?? null
}

function getDefaultUserId(creditCard?: CreditCard) {
  if (!creditCard || !context.value) {
    return ''
  }

  if (creditCard.userId) {
    return creditCard.userId
  }

  return context.value.hasMultipleMembers ? householdAssignmentValue : context.value.currentUserId
}

function getCreditCardUserId(formUserId: string) {
  if (!context.value?.hasMultipleMembers) {
    return context.value?.currentUserId || null
  }

  return formUserId === householdAssignmentValue ? null : formUserId
}

function focusNameInput() {
  if (import.meta.client) {
    nextTick(() => document.getElementById('credit-card-edit-name')?.focus())
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
    title="Edit credit card"
    :close="false"
    :dismissible="false"
    @close="handleClose"
    @update:open="(value: boolean) => !value && close()"
  >
    <template #body>
      <UForm
        id="credit-card-edit-form"
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
            id="credit-card-edit-name"
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
            id="credit-card-edit-assignment"
            v-model="formData.userId"
            class="w-full"
            :items="assignmentOptions"
            :disabled="isDisabled"
          />
        </UFormField>

        <UFormField
          label="Due date"
          name="dueDate"
          required
        >
          <AppDatePicker
            id="credit-card-edit-due-date"
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
            id="credit-card-edit-limit"
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
          label="Save credit card"
          type="submit"
          form="credit-card-edit-form"
          :disabled="!canSubmit"
          :loading="isSaving"
        />
      </div>
    </template>
  </UModal>
</template>
