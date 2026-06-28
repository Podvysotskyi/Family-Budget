<script setup lang="ts">
import ConfirmationModal from '~/components/shared/ConfirmationModal.vue'

defineOptions({
  name: 'GoalDeleteModal'
})

defineProps<{
  open: boolean
  goalName: string
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
    title="Delete goal"
    :description="goalName ? `Permanently delete ${goalName}?` : ''"
    confirm-label="Delete"
    :is-confirming="isDeleting"
    @update:open="emit('update:open', $event)"
    @confirm="emit('confirm')"
  >
    <div class="space-y-2">
      <p>This removes the goal and target history from the database.</p>
      <p
        v-if="error"
        class="text-sm text-error"
      >
        {{ error }}
      </p>
    </div>
  </ConfirmationModal>
</template>
