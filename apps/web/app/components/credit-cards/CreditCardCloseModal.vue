<script setup lang="ts">
import AppDatePicker from '~/components/shared/AppDatePicker.vue'

defineOptions({
  name: 'CreditCardCloseModal'
})

defineProps<{
  open: boolean
  creditCardName: string
  isClosing: boolean
  error: string | null
  minDate: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'keep': []
  'confirm': []
}>()

const effectiveDate = defineModel<string>('effectiveDate', { required: true })
</script>

<template>
  <UModal
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <template #header>
      <div class="text-base font-semibold text-highlighted">
        Cancel credit card
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-muted">
          {{ creditCardName ? `Set the cancellation date for ${creditCardName}.` : '' }}
        </p>

        <div class="space-y-2">
          <label
            for="credit-card-cancellation-effective-date"
            class="text-sm font-medium text-highlighted"
          >
            Effective date
          </label>
          <AppDatePicker
            id="credit-card-cancellation-effective-date"
            v-model="effectiveDate"
            empty-label="Select effective date"
            :min="minDate"
            :disabled="isClosing"
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
          label="Keep credit card"
          :disabled="isClosing"
          @click="emit('keep')"
        />
        <UButton
          color="warning"
          label="Cancel credit card"
          :disabled="!effectiveDate"
          :loading="isClosing"
          @click="emit('confirm')"
        />
      </div>
    </template>
  </UModal>
</template>
