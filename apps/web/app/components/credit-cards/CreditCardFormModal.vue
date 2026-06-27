<script setup lang="ts">
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
  canSave: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'cancel': []
  'save': []
}>()

const creditCardName = defineModel<string>('name', { required: true })
const creditCardUserId = defineModel<string>('userId', { required: true })
const creditCardStartDate = defineModel<string>('startDate', { required: true })
const creditCardEndDate = defineModel<string>('endDate', { required: true })
const creditCardDueDate = defineModel<string>('dueDate', { required: true })
const creditCardLimit = defineModel<string>('limit', { required: true })
const creditCardLimitEffectiveDate = defineModel<string>('limitEffectiveDate', { required: true })

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

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <label
              for="credit-card-start-date"
              class="text-sm font-medium text-highlighted"
            >
              Start date
            </label>
            <AppDatePicker
              id="credit-card-start-date"
              v-model="creditCardStartDate"
              empty-label="Select start date"
              :disabled="isDisabled"
            />
          </div>

          <div class="space-y-2">
            <label
              for="credit-card-end-date"
              class="text-sm font-medium text-highlighted"
            >
              End date
            </label>
            <AppDatePicker
              id="credit-card-end-date"
              v-model="creditCardEndDate"
              empty-label="No end date"
              clearable
              clear-aria-label="Clear end date"
              :disabled="isDisabled"
            />
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
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
              :disabled="isDisabled"
            />
          </div>

          <div class="space-y-2">
            <label
              for="credit-card-limit-effective-date"
              class="text-sm font-medium text-highlighted"
            >
              Limit effective date
            </label>
            <AppDatePicker
              id="credit-card-limit-effective-date"
              v-model="creditCardLimitEffectiveDate"
              empty-label="Select effective date"
              :disabled="isDisabled"
            />
          </div>
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
            v-model="creditCardLimit"
            class="w-full"
            icon="i-lucide-dollar-sign"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
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
          :label="isEditing ? 'Save credit card' : 'Create credit card'"
          :disabled="!canSave"
          :loading="isSaving"
          @click="emit('save')"
        />
      </div>
    </template>
  </UModal>
</template>
