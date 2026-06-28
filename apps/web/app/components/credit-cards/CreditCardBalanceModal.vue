<script setup lang="ts">
import { z } from 'zod'
import type { CreditCardBalanceFormData, CreditCardBalanceSubmitEvent } from '~/types/credit-card-balance'
import type { CreditCard, SaveCreditCardBalanceInput } from '~/types/credit-cards'
import AppDatePicker from '~/components/shared/AppDatePicker.vue'

defineOptions({
  name: 'CreditCardBalanceModal'
})

const creditCardsStore = useCreditCardsStore()
const { formatDateForApi, getToday, parseApiDate } = useDateUtils()
const { addErrorToast, addSuccessToast } = useAppToast()

const isOpen = ref(false)
const selectedCreditCard = ref<CreditCard | null>(null)
const isSaving = ref(false)
const formData = reactive<CreditCardBalanceFormData>({
  date: getToday(),
  balance: undefined
})

const minDate = computed(() => selectedCreditCard.value ? parseApiDate(selectedCreditCard.value.startDate) : null)
const formSchema = computed(() => z.object({
  date: minDate.value
    ? z.date('Balance date is required.').min(minDate.value, 'Balance date must be on or after the start date.')
    : z.date('Balance date is required.'),
  balance: z.number('Balance is required.').min(0, 'Balance must be zero or greater.')
}))

const canSubmit = computed(() => Boolean(selectedCreditCard.value && !isSaving.value))

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
  selectedCreditCard.value = null
  resetForm()
}

async function save(event: CreditCardBalanceSubmitEvent) {
  if (!selectedCreditCard.value) {
    return
  }

  isSaving.value = true

  try {
    const input: SaveCreditCardBalanceInput = {
      date: formatDateForApi(event.data.date),
      balance: event.data.balance
    }

    await creditCardsStore.saveCreditCardBalance(selectedCreditCard.value.householdId, selectedCreditCard.value.id, input)
    addSuccessToast('Credit card balance saved.')
    close(true)
  } catch {
    addErrorToast('Credit card balance could not be saved.')
  } finally {
    isSaving.value = false
  }
}

function resetForm(creditCard?: CreditCard) {
  formData.date = getToday()
  formData.balance = creditCard?.currentBalance === null || creditCard?.currentBalance === undefined
    ? undefined
    : creditCard.currentBalance
}

function updateBalance(value: string | number) {
  formData.balance = value === '' ? undefined : Number(value)
}

defineExpose({
  close,
  open
})
</script>

<template>
  <UModal
    :open="isOpen"
    title="Edit balance"
    :close="false"
    :dismissible="false"
    @update:open="(value: boolean) => !value && close()"
  >
    <template #body>
      <UForm
        id="credit-card-balance-form"
        :schema="formSchema"
        :state="formData"
        class="space-y-4"
        @submit="save"
      >
        <UFormField
          label="Date"
          name="date"
          required
        >
          <AppDatePicker
            id="credit-card-balance-date"
            v-model="formData.date"
            empty-label="Select date"
            :min="minDate"
            :disabled="isSaving"
          />
        </UFormField>

        <UFormField
          label="Amount"
          name="balance"
          required
        >
          <UInput
            id="credit-card-balance-amount"
            :model-value="String(formData.balance ?? '')"
            class="w-full"
            icon="i-lucide-dollar-sign"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            :disabled="isSaving"
            @update:model-value="updateBalance"
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
          label="Save balance"
          type="submit"
          form="credit-card-balance-form"
          :disabled="!canSubmit"
          :loading="isSaving"
        />
      </div>
    </template>
  </UModal>
</template>
