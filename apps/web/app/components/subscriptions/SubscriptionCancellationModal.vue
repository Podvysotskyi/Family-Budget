<script setup lang="ts">
import { z } from 'zod'
import type {
  CancelSubscriptionInput,
  Subscription,
  SubscriptionCancellationFormData,
  SubscriptionCancellationSubmitData,
  SubscriptionCancellationSubmitEvent
} from '~/types/subscriptions'
import AppDatePicker from '~/components/shared/AppDatePicker.vue'

defineOptions({
  name: 'SubscriptionCancellationModal'
})

const subscriptionsStore = useSubscriptionsStore()
const { formatDateToString, getToday, parseDateString } = useDateUtils()
const { addErrorToast, addSuccessToast } = useAppToast()

const emit = defineEmits<{
  closed: []
  saved: []
}>()

const isOpen = ref<boolean>(false)
const selectedSubscription = ref<Subscription | null>(null)
const isSaving = ref<boolean>(false)
const formData = reactive<SubscriptionCancellationFormData>({
  effectiveDate: null
})

const minDate = computed<Date>(() => selectedSubscription.value ? parseDateString(selectedSubscription.value.startDate) || getToday() : getToday())
const formSchema = computed<z.ZodType<SubscriptionCancellationSubmitData>>(() => z.object({
  effectiveDate: z.preprocess(
    value => value === null ? undefined : value,
    z.date('Effective date is required.').min(minDate.value, 'Effective date must be on or after the start date.')
  )
}))
const canSubmit = computed<boolean>(() => Boolean(selectedSubscription.value && !isSaving.value))

function open(subscription: Subscription) {
  if (subscription.endDate) {
    return
  }

  selectedSubscription.value = subscription
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

  selectedSubscription.value = null
  resetForm()
  emit('closed')
}

async function save(event: SubscriptionCancellationSubmitEvent) {
  if (!selectedSubscription.value) {
    return
  }

  if (selectedSubscription.value.endDate) {
    return
  }

  isSaving.value = true

  try {
    const input: CancelSubscriptionInput = {
      effectiveDate: formatDateToString(event.data.effectiveDate)
    }

    await subscriptionsStore.cancelSubscription(selectedSubscription.value.id, input)
    addSuccessToast('Subscription canceled.')
    emit('saved')
    close(true)
  } catch {
    addErrorToast('Subscription could not be canceled.')
  } finally {
    isSaving.value = false
  }
}

function resetForm() {
  formData.effectiveDate = getDefaultEffectiveDate()
}

function getDefaultEffectiveDate() {
  const today = getToday()
  const startDate = selectedSubscription.value ? parseDateString(selectedSubscription.value.startDate) : null

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
    title="Cancel subscription"
    :close="false"
    :dismissible="false"
    @close="handleClose"
    @update:open="(value: boolean) => !value && close()"
  >
    <template #body>
      <UForm
        id="subscription-cancellation-form"
        :schema="formSchema"
        :state="formData"
        class="space-y-4"
        @submit="save"
      >
        <p class="text-sm text-muted">
          {{ selectedSubscription ? `Set the cancellation date for ${selectedSubscription.name}.` : '' }}
        </p>

        <UFormField
          label="Effective date"
          name="effectiveDate"
          required
        >
          <AppDatePicker
            id="subscription-cancellation-effective-date"
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
          label="Keep subscription"
          :disabled="isSaving"
          @click="close()"
        />
        <UButton
          color="warning"
          label="Cancel subscription"
          type="submit"
          form="subscription-cancellation-form"
          :disabled="!canSubmit"
          :loading="isSaving"
        />
      </div>
    </template>
  </UModal>
</template>
