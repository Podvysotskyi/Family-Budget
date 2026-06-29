<script setup lang="ts">
import { z } from 'zod'
import type {
  CreditCard,
  CreditCardEditFormData,
  CreditCardEditFormSubmitEvent,
  SaveCreditCardInput
} from '~/types/credit-cards'
import AppDatePicker from '~/components/shared/AppDatePicker.vue'

defineOptions({
  name: 'CreditCardEditModal'
})

const authStore = useAuthStore()
const creditCardsStore = useCreditCardsStore()
const householdStore = useHouseholdStore()
const { formatDateToString, getToday, parseDateString } = useDateUtils()
const { addErrorToast, addSuccessToast } = useAppToast()

const emit = defineEmits<{
  closed: []
  saved: []
}>()

const isOpen = ref(false)
const selectedCreditCard = ref<CreditCard | null>(null)
const isSaving = ref(false)
const formData = reactive<CreditCardEditFormData>({
  name: '',
  userId: '',
  dueDate: null,
  limit: null
})

const hasMultipleMembers = computed(() => householdStore.membersCount > 1)
const assignmentOptions = computed(() => {
  return [
    ...(hasMultipleMembers.value
      ? [{
          label: 'Household',
          value: ''
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
const dueDateMin = computed<Date>(() => {
  if (!selectedCreditCard.value) {
    return getToday()
  }

  return parseDateString(selectedCreditCard.value.startDate) || getToday()
})
const formSchema = computed(() => z.object({
  name: z.string().trim().min(1, 'Credit card name is required.'),
  userId: z.string(),
  dueDate: z.preprocess(
    value => value === null ? undefined : value,
    z.date('Due date is required.').min(dueDateMin.value, 'Due date must be on or after the start date.')
  ),
  limit: z.preprocess(
    value => value === null ? undefined : value,
    z.number('Limit is required.').min(0.01, 'Limit must be greater than zero.')
  )
}))

function open(creditCard: CreditCard) {
  if (creditCard.endDate) {
    return
  }

  selectedCreditCard.value = creditCard
  resetForm(creditCard)
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

  selectedCreditCard.value = null
  resetForm()
  emit('closed')
}

async function save(event: CreditCardEditFormSubmitEvent) {
  if (!selectedCreditCard.value) {
    return
  }

  isSaving.value = true

  try {
    const input: SaveCreditCardInput = {
      name: event.data.name.trim(),
      userId: event.data.userId || null,
      dueDate: formatDateToString(event.data.dueDate),
      limit: event.data.limit,
      startDate: selectedCreditCard.value.startDate
    }

    await creditCardsStore.updateCreditCard(selectedCreditCard.value.id, input)
    addSuccessToast('Credit card saved.')
    emit('saved')
    close(true)
  } catch {
    addErrorToast('Credit card could not be saved.')
  } finally {
    isSaving.value = false
  }
}

function resetForm(creditCard?: CreditCard) {
  formData.name = creditCard?.name || ''
  formData.userId = creditCard?.user?.userId || ''
  formData.dueDate = creditCard ? parseDateString(creditCard.dueDate) : null
  formData.limit = creditCard?.currentLimit ?? null
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
            :disabled="isSaving"
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
            :disabled="isSaving || !hasMultipleMembers"
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
            :disabled="isSaving"
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
            :disabled="isSaving"
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
          :disabled="isSaving"
          :loading="isSaving"
        />
      </div>
    </template>
  </UModal>
</template>
