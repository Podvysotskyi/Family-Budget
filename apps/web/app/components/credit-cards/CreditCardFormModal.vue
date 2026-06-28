<script setup lang="ts">
import { z } from 'zod'
import type {
  CreditCard,
  CreditCardFormData,
  CreditCardFormSubmitEvent,
  SaveCreditCardInput
} from '~/types/credit-cards'
import AppDatePicker from '~/components/shared/AppDatePicker.vue'

type SelectOption = { label: string, value: string }

type CreditCardFormContext = {
  assignmentOptions: SelectOption[]
  currentUserId: string
  defaultUserId: string
  hasMultipleMembers: boolean
  householdId: string
}

defineOptions({
  name: 'CreditCardFormModal'
})

const householdAssignmentValue = 'household'
const creditCardsStore = useCreditCardsStore()
const { formatDateToString, getToday, parseDateString } = useDateUtils()
const { addErrorToast, addSuccessToast } = useAppToast()

const isOpen = ref(false)
const selectedCreditCard = ref<CreditCard | null>(null)
const isSaving = ref(false)
const context = ref<CreditCardFormContext | null>(null)
const formData = reactive<CreditCardFormData>({
  name: '',
  userId: '',
  dueDate: null,
  limit: null
})

const assignmentOptions = computed(() => context.value?.assignmentOptions || [])
const isEditing = computed(() => Boolean(selectedCreditCard.value))
const title = computed(() => isEditing.value ? 'Edit credit card' : 'New credit card')
const submitLabel = computed(() => isEditing.value ? 'Save credit card' : 'Create credit card')
const dueDateMin = computed(() => selectedCreditCard.value ? parseDateString(selectedCreditCard.value.startDate) || getToday() : undefined)
const formSchema = computed(() => z.object({
  name: z.string().trim().min(1, 'Credit card name is required.'),
  userId: z.string().min(1, 'Assignment is required.'),
  dueDate: z.preprocess(
    value => value === null ? undefined : value,
    selectedCreditCard.value
      ? z.date('Due date is required.').min(dueDateMin.value || getToday(), 'Due date must be on or after the start date.')
      : z.date('Due date is required.')
  ),
  limit: z.preprocess(
    value => value === null ? undefined : value,
    z.number('Limit is required.').min(0.01, 'Limit must be greater than zero.')
  )
}))
const canSubmit = computed(() => Boolean(context.value?.householdId && !isSaving.value))
const isDisabled = computed(() => isSaving.value || !context.value?.householdId)

function openCreate(formContext: CreditCardFormContext) {
  context.value = formContext
  selectedCreditCard.value = null
  resetForm()
  isOpen.value = true
  focusNameInput()
}

function openEdit(creditCard: CreditCard, formContext: CreditCardFormContext) {
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
  selectedCreditCard.value = null
  context.value = null
  resetForm()
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
      dueDate: formatDateToString(event.data.dueDate),
      limit: event.data.limit
    }

    if (selectedCreditCard.value) {
      await creditCardsStore.updateCreditCard(context.value.householdId, selectedCreditCard.value.id, {
        ...input,
        startDate: selectedCreditCard.value.startDate
      })
      addSuccessToast('Credit card saved.')
    } else {
      await creditCardsStore.createCreditCard(context.value.householdId, input)
      addSuccessToast('Credit card created.')
    }

    close(true)
  } catch {
    addErrorToast(selectedCreditCard.value ? 'Credit card could not be saved.' : 'Credit card could not be created.')
  } finally {
    isSaving.value = false
  }
}

function resetForm(creditCard?: CreditCard) {
  const latestLimit = creditCard?.limits[0]

  formData.name = creditCard?.name || ''
  formData.userId = creditCard?.userId || context.value?.defaultUserId || ''
  formData.dueDate = creditCard ? parseDateString(creditCard.dueDate) : getToday()
  formData.limit = creditCard?.currentLimit ?? latestLimit?.limit ?? null
}

function getCreditCardUserId(formUserId: string) {
  if (!context.value?.hasMultipleMembers) {
    return context.value?.currentUserId || null
  }

  return formUserId === householdAssignmentValue ? null : formUserId
}

function focusNameInput() {
  if (import.meta.client) {
    nextTick(() => document.getElementById('credit-card-name')?.focus())
  }
}

defineExpose({
  close,
  openCreate,
  openEdit
})
</script>

<template>
  <UModal
    :open="isOpen"
    :title="title"
    :close="false"
    :dismissible="false"
    @update:open="(value: boolean) => !value && close()"
  >
    <template #body>
      <UForm
        id="credit-card-form"
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
            id="credit-card-name"
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
            id="credit-card-assignment"
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
            id="credit-card-due-date"
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
            id="credit-card-limit"
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
          :label="submitLabel"
          type="submit"
          form="credit-card-form"
          :disabled="!canSubmit"
          :loading="isSaving"
        />
      </div>
    </template>
  </UModal>
</template>
