<script setup lang="ts">
defineOptions({
  name: 'ConfirmationModal'
})

withDefaults(defineProps<{
  cancelLabel?: string
  confirmLabel?: string
  description?: string
  icon?: string
  isConfirming?: boolean
  open: boolean
  title: string
}>(), {
  cancelLabel: 'Cancel',
  confirmLabel: 'Confirm',
  description: '',
  icon: 'i-lucide-triangle-alert',
  isConfirming: false
})

const emit = defineEmits<{
  'confirm': []
  'update:open': [value: boolean]
}>()

function closeModal() {
  emit('update:open', false)
}
</script>

<template>
  <UModal
    :open="open"
    :title="title"
    :description="description"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="flex items-start gap-3">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-md bg-error/10 text-error">
          <UIcon
            :name="icon"
            class="size-5"
          />
        </div>
        <div class="min-w-0">
          <p class="text-sm text-muted">
            <slot>
              This action cannot be undone.
            </slot>
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          :label="cancelLabel"
          :disabled="isConfirming"
          @click="closeModal"
        />
        <UButton
          color="error"
          :label="confirmLabel"
          :loading="isConfirming"
          @click="emit('confirm')"
        />
      </div>
    </template>
  </UModal>
</template>
