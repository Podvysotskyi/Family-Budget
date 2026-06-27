<script setup lang="ts">
defineOptions({
  name: 'SubscriptionCancellationModal'
})

defineProps<{
  open: boolean
  subscriptionName: string
  isCanceling: boolean
  error: string | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'keep': []
  'cancelSubscription': []
}>()

const effectiveDate = defineModel<string>('effectiveDate', { required: true })
</script>

<template>
  <UModal
    :open="open"
    title="Cancel subscription"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-muted">
          {{ subscriptionName ? `Set the cancellation date for ${subscriptionName}.` : '' }}
        </p>

        <div class="space-y-2">
          <label
            for="subscription-cancellation-effective-date"
            class="text-sm font-medium text-highlighted"
          >
            Effective date
          </label>
          <AppDatePicker
            id="subscription-cancellation-effective-date"
            v-model="effectiveDate"
            empty-label="Select effective date"
            :disabled="isCanceling"
          />
        </div>

        <p
          v-if="error"
          class="text-sm text-error"
        >
          {{ error }}
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          label="Keep subscription"
          :disabled="isCanceling"
          @click="emit('keep')"
        />
        <UButton
          color="warning"
          label="Cancel subscription"
          :disabled="!effectiveDate"
          :loading="isCanceling"
          @click="emit('cancelSubscription')"
        />
      </div>
    </template>
  </UModal>
</template>
