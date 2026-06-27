<script setup lang="ts">
defineOptions({
  name: 'GoalCloseModal'
})

defineProps<{
  open: boolean
  goalName: string
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
    title="Close goal"
    :description="goalName ? `Close ${goalName}?` : ''"
    confirm-label="Close"
    :is-confirming="isClosing"
    @update:open="emit('update:open', $event)"
    @confirm="emit('confirm')"
  >
    <div class="space-y-2">
      <p>This sets the goal end date to today and keeps transactions intact.</p>
      <p
        v-if="error"
        class="text-sm text-error"
      >
        {{ error }}
      </p>
    </div>
  </ConfirmationModal>
</template>
