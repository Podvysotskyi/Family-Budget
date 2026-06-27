<script setup lang="ts">
import type { SubscriptionType } from '~/stores/subscriptions'

type SelectOption = { label: string, value: string }

defineOptions({
  name: 'SubscriptionFormModal'
})

const props = defineProps<{
  open: boolean
  isEditing: boolean
  pending: boolean
  isSaving: boolean
  hasHousehold: boolean
  formError: string | null
  typeOptions: SelectOption[]
  canSave: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'cancel': []
  'save': []
}>()

const subscriptionName = defineModel<string>('name', { required: true })
const subscriptionAmount = defineModel<string>('amount', { required: true })
const subscriptionType = defineModel<SubscriptionType>('type', { required: true })
const subscriptionStartDate = defineModel<string>('startDate', { required: true })
const subscriptionEndDate = defineModel<string>('endDate', { required: true })
const subscriptionNextChargeDate = defineModel<string>('nextChargeDate', { required: true })
const subscriptionAutopay = defineModel<boolean>('autopay', { required: true })

const isDisabled = computed(() => props.pending || props.isSaving || !props.hasHousehold)
</script>

<template>
  <UModal
    :open="open"
    :title="isEditing ? 'Edit subscription' : 'New subscription'"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <form
        class="space-y-4"
        @submit.prevent="emit('save')"
      >
        <div class="space-y-2">
          <label
            for="subscription-name"
            class="text-sm font-medium text-highlighted"
          >
            Name
          </label>
          <UInput
            id="subscription-name"
            v-model="subscriptionName"
            class="w-full"
            placeholder="Netflix"
            :disabled="isDisabled"
          />
        </div>

        <div class="space-y-2">
          <label
            for="subscription-amount"
            class="text-sm font-medium text-highlighted"
          >
            Amount
          </label>
          <UInput
            id="subscription-amount"
            v-model="subscriptionAmount"
            class="w-full"
            icon="i-lucide-dollar-sign"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            :disabled="isDisabled"
          />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-highlighted">
            Type
          </label>
          <USelect
            v-model="subscriptionType"
            class="w-full"
            :items="typeOptions"
            :disabled="isDisabled"
          />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <label
              for="subscription-start-date"
              class="text-sm font-medium text-highlighted"
            >
              Start date
            </label>
            <AppDatePicker
              id="subscription-start-date"
              v-model="subscriptionStartDate"
              empty-label="Select start date"
              :disabled="isDisabled"
            />
          </div>

          <div class="space-y-2">
            <label
              for="subscription-end-date"
              class="text-sm font-medium text-highlighted"
            >
              End date
            </label>
            <AppDatePicker
              id="subscription-end-date"
              v-model="subscriptionEndDate"
              empty-label="No end date"
              clearable
              clear-aria-label="Clear end date"
              :disabled="isDisabled"
            />
          </div>
        </div>

        <div
          v-if="isEditing"
          class="space-y-2"
        >
          <label
            for="subscription-next-charge-date"
            class="text-sm font-medium text-highlighted"
          >
            Next charge date
          </label>
          <AppDatePicker
            id="subscription-next-charge-date"
            v-model="subscriptionNextChargeDate"
            empty-label="Select next charge date"
            :disabled="isDisabled"
          />
        </div>

        <div class="rounded-lg border border-default px-3 py-2">
          <USwitch
            v-model="subscriptionAutopay"
            label="Autopay"
            description="Automatically mark this subscription as paid on its due date."
            :disabled="isDisabled"
          />
        </div>

        <p
          v-if="formError"
          class="text-sm text-error"
        >
          {{ formError }}
        </p>
      </form>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          label="Cancel"
          :disabled="isSaving"
          @click="emit('cancel')"
        />
        <UButton
          color="primary"
          :label="isEditing ? 'Save subscription' : 'Create subscription'"
          :disabled="!canSave"
          :loading="isSaving"
          @click="emit('save')"
        />
      </div>
    </template>
  </UModal>
</template>
