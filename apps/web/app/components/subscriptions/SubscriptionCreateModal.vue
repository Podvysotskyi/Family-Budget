<script setup lang="ts">
import { z } from 'zod'
import type {
  SaveSubscriptionInput,
  SubscriptionCreateFormData,
  SubscriptionCreateFormSubmitData,
  SubscriptionCreateFormSubmitEvent,
  SubscriptionType
} from '~/types/subscriptions'
import AppDatePicker from '~/components/shared/AppDatePicker.vue'

defineOptions({
  name: 'SubscriptionCreateModal'
})

const subscriptionsStore = useSubscriptionsStore()
const householdStore = useHouseholdStore()
const { formatDateToString, getToday } = useDateUtils()
const { addErrorToast, addSuccessToast } = useAppToast()

const emit = defineEmits<{
  closed: []
  created: []
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
const isSaving = ref<boolean>(false)
const selectedUserId = ref<string | null>(null)
const formData = reactive<SubscriptionCreateFormData>({
  name: '',
  type: 'monthly',
  startDate: null,
  dueDate: null,
  endDate: null,
  amount: null,
  autopay: false
})

const endDateMin = computed<Date>(() => formData.startDate || getToday())
const dueDateMin = computed<Date>(() => formData.startDate || getToday())
const dueDateMax = computed<Date | undefined>(() => formData.endDate || undefined)
const formSchema = computed<z.ZodType<SubscriptionCreateFormSubmitData>>(() => z.object({
  name: z.string().trim().min(1, 'Subscription name is required.'),
  type: z.enum(['monthly', 'yearly']),
  startDate: z.preprocess(
    value => value === null ? undefined : value,
    z.date('Start date is required.')
  ),
  dueDate: z.preprocess(
    value => value === null ? undefined : value,
    z.date('Due date is required.')
      .min(dueDateMin.value, 'Due date must be on or after the start date.')
      .refine(
        value => !dueDateMax.value || value <= dueDateMax.value,
        'Due date must be on or before the end date.'
      )
  ),
  endDate: z.preprocess(
    value => value === null ? null : value,
    z.date().nullable().refine(
      value => !value || value >= endDateMin.value,
      'End date must be on or after the start date.'
    )
  ),
  amount: z.preprocess(
    value => value === null ? undefined : value,
    z.number('Amount is required.').min(0.01, 'Amount must be greater than zero.')
  ),
  autopay: z.boolean()
}))

watch(() => formData.startDate, (startDate) => {
  if (startDate && formData.dueDate && formData.dueDate < startDate) {
    formData.dueDate = startDate
  }

  if (startDate && formData.endDate && formData.endDate < startDate) {
    formData.endDate = startDate
  }
})

watch(() => formData.endDate, (endDate) => {
  if (endDate && formData.dueDate && formData.dueDate > endDate) {
    formData.dueDate = endDate
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

async function save(event: SubscriptionCreateFormSubmitEvent) {
  if (!householdStore.householdId) {
    return
  }

  isSaving.value = true

  try {
    const input: SaveSubscriptionInput = {
      name: event.data.name.trim(),
      userId: selectedUserId.value,
      type: event.data.type,
      startDate: formatDateToString(event.data.startDate),
      endDate: event.data.endDate ? formatDateToString(event.data.endDate) : null,
      nextChargeDate: formatDateToString(event.data.dueDate),
      amount: event.data.amount,
      autopay: event.data.autopay
    }

    if (selectedUserId.value) {
      await subscriptionsStore.createUserSubscription(selectedUserId.value, input)
    } else {
      await subscriptionsStore.createHouseholdSubscription(householdStore.householdId, input)
    }

    addSuccessToast('Subscription created.')
    emit('created')
    close(true)
  } catch {
    addErrorToast('Subscription could not be created.')
  } finally {
    isSaving.value = false
  }
}

function resetForm() {
  formData.name = ''
  formData.type = 'monthly'
  formData.startDate = getToday()
  formData.dueDate = getToday()
  formData.endDate = null
  formData.amount = null
  formData.autopay = false
}

defineExpose({
  close,
  open
})
</script>

<template>
  <UModal
    :open="isOpen"
    title="New subscription"
    :close="false"
    :dismissible="false"
    @close="handleClose"
    @update:open="(value: boolean) => !value && close()"
  >
    <template #body>
      <UForm
        id="subscription-create-form"
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
            id="subscription-create-name"
            v-model="formData.name"
            class="w-full"
            placeholder="Netflix"
            :disabled="isSaving"
          />
        </UFormField>

        <UFormField
          label="Amount"
          name="amount"
          required
        >
          <UInput
            id="subscription-create-amount"
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
            id="subscription-create-type"
            v-model="formData.type"
            class="w-full"
            :items="typeOptions"
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
              id="subscription-create-start-date"
              v-model="formData.startDate"
              empty-label="Select start date"
              :disabled="isSaving"
            />
          </UFormField>

          <UFormField
            label="Due date"
            name="dueDate"
            required
          >
            <AppDatePicker
              id="subscription-create-due-date"
              v-model="formData.dueDate"
              empty-label="Select due date"
              :min="dueDateMin"
              :max="dueDateMax"
              :disabled="isSaving"
            />
          </UFormField>

          <UFormField
            label="End date"
            name="endDate"
          >
            <AppDatePicker
              id="subscription-create-end-date"
              v-model="formData.endDate"
              empty-label="No end date"
              clearable
              clear-aria-label="Clear end date"
              :min="endDateMin"
              :disabled="isSaving"
            />
          </UFormField>
        </div>

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
          label="Create subscription"
          type="submit"
          form="subscription-create-form"
          :disabled="isSaving"
          :loading="isSaving"
        />
      </div>
    </template>
  </UModal>
</template>
