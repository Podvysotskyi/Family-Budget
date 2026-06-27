<script setup lang="ts">
defineOptions({
  name: 'CreditCardCloseModal'
})

defineProps<{
  open: boolean
  creditCardName: string
  isClosing: boolean
  error: string | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': []
}>()
</script>

<template>
  <ConfirmationModal
    :open="open"
    title="Close credit card"
    :description="creditCardName ? `Close ${creditCardName}?` : ''"
    confirm-label="Close"
    :is-confirming="isClosing"
    @update:open="emit('update:open', $event)"
    @confirm="emit('confirm')"
  >
    <div class="space-y-2">
      <p>This sets the card end date to today and keeps historical records intact.</p>
      <p
        v-if="error"
        class="text-sm text-error"
      >
        {{ error }}
      </p>
    </div>
  </ConfirmationModal>
</template>
