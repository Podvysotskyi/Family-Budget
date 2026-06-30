<script setup lang="ts">
import { z } from 'zod'
import type {
  SaveSubscriptionInput,
  Subscription,
  SubscriptionEditFormData,
  SubscriptionEditFormSubmitData,
  SubscriptionEditFormSubmitEvent,
  SubscriptionType
} from '~/types/subscriptions'
import AppDatePicker from '~/components/shared/AppDatePicker.vue'

defineOptions({
  name: 'SubscriptionEditModal'
})

const authStore = useAuthStore()
const householdStore = useHouseholdStore()
const subscriptionsStore = useSubscriptionsStore()
const { formatDateToString, getToday, parseDateString } = useDateUtils()
const { addErrorToast, addSuccessToast } = useAppToast()

const emit = defineEmits<{
  closed: []
  saved: []
}>()

const typeOptions: { label: string, value: SubscriptionType }[] = [
  {
    label: 'Monthly',
    value: 'monthly'
  },
  {
    label: 'Yearly',
    value: 'yearly'
  }
]

const isOpen = ref<boolean>(false)
const selectedSubscription = ref<Subscription | null>(null)
const originalNextChargeDate = ref<string | null>(null)
const isSaving = ref<boolean>(false)
const formData = reactive<SubscriptionEditFormData>({
  name: '',
  userId: '',
  type: 'monthly',
  nextChargeDate: null,
  amount: null,
  autopay: false
})

const hasMultipleMembers = computed<boolean>(() => householdStore.membersCount > 1)
const assignmentOptions = computed<{ label: string, value: string }[]>(() => {
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
const nextChargeDateMin = computed<Date>(() => {
  if (!selectedSubscription.value) {
    return getToday()
  }

  return parseDateString(selectedSubscription.value.startDate) || getToday()
})
const formSchema = computed<z.ZodType<SubscriptionEditFormSubmitData>>(() => z.object({
  name: z.string().trim().min(1, 'Subscription name is required.'),
  userId: z.string(),
  type: z.enum(['monthly', 'yearly']),
  nextChargeDate: z.preprocess(
    value => value === null ? undefined : value,
    z.date('Next due date is required.').min(nextChargeDateMin.value, 'Next due date must be on or after the start date.')
  ),
  amount: z.preprocess(
    value => value === null ? undefined : value,
    z.number('Amount is required.').min(0.01, 'Amount must be greater than zero.')
  ),
  autopay: z.boolean()
}))

function open(subscription: Subscription) {
  if (subscription.endDate) {
    return
  }

  selectedSubscription.value = subscription
  resetForm(subscription)
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
  originalNextChargeDate.value = null
  resetForm()
  emit('closed')
}

async function save(event: SubscriptionEditFormSubmitEvent) {
  if (!selectedSubscription.value) {
    return
  }

  isSaving.value = true

  try {
    const nextChargeDate = formatDateToString(event.data.nextChargeDate)
    const input: SaveSubscriptionInput = {
      name: event.data.name.trim(),
      userId: event.data.userId || null,
      type: event.data.type,
      startDate: selectedSubscription.value.startDate,
      endDate: null,
      nextChargeDate: nextChargeDate !== originalNextChargeDate.value ? nextChargeDate : null,
      amount: event.data.amount,
      autopay: event.data.autopay
    }

    await subscriptionsStore.updateSubscription(selectedSubscription.value.id, input)
    addSuccessToast('Subscription saved.')
    emit('saved')
    close(true)
  } catch {
    addErrorToast('Subscription could not be saved.')
  } finally {
    isSaving.value = false
  }
}

function resetForm(subscription?: Subscription) {
  const nextChargeDate = subscription?.nextChargeDate || subscription?.startDate || ''

  formData.name = subscription?.name || ''
  formData.userId = subscription?.user?.userId || ''
  formData.type = subscription?.type || 'monthly'
  formData.nextChargeDate = nextChargeDate ? parseDateString(nextChargeDate) : null
  formData.amount = subscription?.amount ?? null
  formData.autopay = subscription?.autopay || false
  originalNextChargeDate.value = nextChargeDate || null
}

defineExpose({
  close,
  open
})
</script>

<template>
  <UModal
    :open="isOpen"
    title="Edit subscription"
    :close="false"
    :dismissible="false"
    @close="handleClose"
    @update:open="(value: boolean) => !value && close()"
  >
    <template #body>
      <UForm
        id="subscription-edit-form"
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
            id="subscription-edit-name"
            v-model="formData.name"
            class="w-full"
            placeholder="Netflix"
            :disabled="isSaving"
          />
        </UFormField>

        <UFormField
          label="Assignment"
          name="userId"
          required
        >
          <USelect
            id="subscription-edit-assignment"
            v-model="formData.userId"
            class="w-full"
            :items="assignmentOptions"
            :disabled="isSaving || !hasMultipleMembers"
          />
        </UFormField>

        <UFormField
          label="Amount"
          name="amount"
          required
        >
          <UInput
            id="subscription-edit-amount"
            v-model.nullable="formData.amount"
            class="w-full"
            icon="i-lucide-dollar-sign"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            :disabled="isSaving"
          />
        </UFormField>

        <UFormField
          label="Type"
          name="type"
          required
        >
          <USelect
            id="subscription-edit-type"
            v-model="formData.type"
            class="w-full"
            :items="typeOptions"
            :disabled="isSaving"
          />
        </UFormField>

        <UFormField
          label="Next due date"
          name="nextChargeDate"
          required
        >
          <AppDatePicker
            id="subscription-edit-next-charge-date"
            v-model="formData.nextChargeDate"
            empty-label="Select next due date"
            :min="nextChargeDateMin"
            :disabled="isSaving"
          />
        </UFormField>

        <div class="rounded-lg border border-default px-3 py-2">
          <USwitch
            v-model="formData.autopay"
            label="Autopay"
            description="Automatically mark this subscription as paid on its due date."
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
          label="Save subscription"
          type="submit"
          form="subscription-edit-form"
          :disabled="isSaving"
          :loading="isSaving"
        />
      </div>
    </template>
  </UModal>
</template>
