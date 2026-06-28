<script setup lang="ts">
import { z } from 'zod'
import type {
  CreditCard,
  CancelCreditCardInput,
  CreditCardCancellationFormData,
  CreditCardCancellationSubmitEvent
} from '~/types/credit-cards'
import AppDatePicker from '~/components/shared/AppDatePicker.vue'

defineOptions({
  name: 'CreditCardCloseModal'
})

const creditCardsStore = useCreditCardsStore()
const { formatDateToString, getToday, parseDateString } = useDateUtils()
const { addErrorToast, addSuccessToast } = useAppToast()

const isOpen = ref(false)
const selectedCreditCard = ref<CreditCard | null>(null)
const isSaving = ref(false)
const formData = reactive<CreditCardCancellationFormData>({
  effectiveDate: null
})

const minDate = computed(() => selectedCreditCard.value ? parseDateString(selectedCreditCard.value.startDate) || getToday() : getToday())
const formSchema = computed(() => z.object({
  effectiveDate: z.preprocess(
    value => value === null ? undefined : value,
    z.date('Effective date is required.').min(minDate.value, 'Effective date must be on or after the start date.')
  )
}))
const canSubmit = computed(() => Boolean(selectedCreditCard.value && !isSaving.value))

function open(creditCard: CreditCard) {
  if (creditCard.endDate) {
    return
  }

  selectedCreditCard.value = creditCard
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

  selectedCreditCard.value = null
  resetForm()
}

async function save(event: CreditCardCancellationSubmitEvent) {
  if (!selectedCreditCard.value) {
    return
  }

  if (selectedCreditCard.value.endDate) {
    return
  }

  isSaving.value = true

  try {
    const input: CancelCreditCardInput = {
      effectiveDate: formatDateToString(event.data.effectiveDate)
    }

    await creditCardsStore.cancelCreditCard(selectedCreditCard.value.householdId, selectedCreditCard.value.id, input)
    addSuccessToast('Credit card canceled.')
    close(true)
  } catch {
    addErrorToast('Credit card could not be canceled.')
  } finally {
    isSaving.value = false
  }
}

function resetForm() {
  formData.effectiveDate = getDefaultEffectiveDate()
}

function getDefaultEffectiveDate() {
  const today = getToday()
  const startDate = selectedCreditCard.value ? parseDateString(selectedCreditCard.value.startDate) : null

  return startDate && startDate > today ? startDate : today
}

defineExpose({
  close,
  open
})
</script>

<template>
  <UModal
    :open="isOpen"
    title="Cancel credit card"
    :close="false"
    :dismissible="false"
    @close="handleClose"
    @update:open="(value: boolean) => !value && close()"
  >
    <template #body>
      <UForm
        id="credit-card-cancellation-form"
        :schema="formSchema"
        :state="formData"
        class="space-y-4"
        @submit="save"
      >
        <p class="text-sm text-muted">
          {{ selectedCreditCard ? `Set the cancellation date for ${selectedCreditCard.name}.` : '' }}
        </p>

        <UFormField
          label="Effective date"
          name="effectiveDate"
          required
        >
          <AppDatePicker
            id="credit-card-cancellation-effective-date"
            v-model="formData.effectiveDate"
            empty-label="Select effective date"
            :min="minDate"
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
          label="Keep credit card"
          :disabled="isSaving"
          @click="close()"
        />
        <UButton
          color="warning"
          label="Cancel credit card"
          type="submit"
          form="credit-card-cancellation-form"
          :disabled="!canSubmit"
          :loading="isSaving"
        />
      </div>
    </template>
  </UModal>
</template>
