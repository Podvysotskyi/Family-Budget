<script setup lang="ts">
import AppDatePicker from '~/components/shared/AppDatePicker.vue'

type SelectOption = { label: string, value: string }

defineOptions({
  name: 'CreditCardFormModal'
})

const props = defineProps<{
  open: boolean
  isEditing: boolean
  pending: boolean
  isSaving: boolean
  hasHousehold: boolean
  formError: string | null
  assignmentOptions: SelectOption[]
  dueDateMin?: string
  canSave: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'cancel': []
  'save': []
}>()

const creditCardName = defineModel<string>('name', { required: true })
const creditCardUserId = defineModel<string>('userId', { required: true })
const creditCardDueDate = defineModel<string>('dueDate', { required: true })
const creditCardLimit = defineModel<string | number>('limit', { required: true })

const isDisabled = computed(() => props.pending || props.isSaving || !props.hasHousehold)
</script>

<template>
  <UModal
    :open="open"
    :title="isEditing ? 'Edit credit card' : 'New credit card'"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <form
        class="space-y-4"
        @submit.prevent="emit('save')"
      >
        <div class="space-y-2">
          <label
            for="credit-card-name"
            class="text-sm font-medium text-highlighted"
          >
            Name
          </label>
          <UInput
            id="credit-card-name"
            v-model="creditCardName"
            class="w-full"
            placeholder="Sapphire Preferred"
            :disabled="isDisabled"
          />
        </div>

        <div class="space-y-2">
          <label
            for="credit-card-assignment"
            class="text-sm font-medium text-highlighted"
          >
            Assignment
          </label>
          <USelect
            id="credit-card-assignment"
            v-model="creditCardUserId"
            class="w-full"
            :items="assignmentOptions"
            :disabled="isDisabled"
          />
        </div>

        <div class="space-y-2">
          <label
            for="credit-card-due-date"
            class="text-sm font-medium text-highlighted"
          >
            Due date
          </label>
          <AppDatePicker
            id="credit-card-due-date"
            v-model="creditCardDueDate"
            empty-label="Select due date"
            :min="dueDateMin"
            :disabled="isDisabled"
          />
        </div>

        <div class="space-y-2">
          <label
            for="credit-card-limit"
            class="text-sm font-medium text-highlighted"
          >
            Limit
          </label>
          <UInput
            id="credit-card-limit"
            :model-value="String(creditCardLimit)"
            class="w-full"
            icon="i-lucide-dollar-sign"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            :disabled="isDisabled"
            @update:model-value="value => creditCardLimit = String(value || '')"
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
          :label="isEditing ? 'Save credit card' : 'Create credit card'"
          :disabled="!canSave"
          :loading="isSaving"
          @click="emit('save')"
        />
      </div>
    </template>
  </UModal>
</template>
