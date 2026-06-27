<script setup lang="ts">
defineOptions({
  name: 'SubscriptionDeleteModal'
})

defineProps<{
  open: boolean
  subscriptionName: string
  isDeleting: boolean
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
    title="Delete subscription"
    :description="subscriptionName ? `Delete ${subscriptionName}?` : ''"
    confirm-label="Delete"
    :is-confirming="isDeleting"
    @update:open="emit('update:open', $event)"
    @confirm="emit('confirm')"
  >
    <div class="space-y-2">
      <p>This subscription will be permanently removed from the household.</p>
      <p
        v-if="error"
        class="text-sm text-error"
      >
        {{ error }}
      </p>
    </div>
  </ConfirmationModal>
</template>
