<script setup lang="ts">
import type { GoalTargetType } from '~/types/goals'
import AppDatePicker from '~/components/shared/AppDatePicker.vue'

type SelectOption = { label: string, value: string }

defineOptions({
  name: 'GoalFormModal'
})

const props = defineProps<{
  open: boolean
  isEditing: boolean
  pending: boolean
  isSaving: boolean
  hasHousehold: boolean
  formError: string | null
  assignmentOptions: SelectOption[]
  targetTypeOptions: SelectOption[]
  canSave: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'cancel': []
  'save': []
}>()

const goalName = defineModel<string>('name', { required: true })
const goalUserId = defineModel<string>('userId', { required: true })
const goalStartDate = defineModel<string>('startDate', { required: true })
const goalEndDate = defineModel<string>('endDate', { required: true })
const goalIncludeInBudget = defineModel<boolean>('includeInBudget', { required: true })
const goalTargetType = defineModel<GoalTargetType>('targetType', { required: true })
const goalTargetAmount = defineModel<string>('targetAmount', { required: true })

const isDisabled = computed(() => props.pending || props.isSaving || !props.hasHousehold)
</script>

<template>
  <UModal
    :open="open"
    :title="isEditing ? 'Edit goal' : 'New goal'"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <form
        class="space-y-4"
        @submit.prevent="emit('save')"
      >
        <div class="space-y-2">
          <label
            for="goal-name"
            class="text-sm font-medium text-highlighted"
          >
            Name
          </label>
          <UInput
            id="goal-name"
            v-model="goalName"
            class="w-full"
            placeholder="Emergency fund"
            :disabled="isDisabled"
          />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <label
              for="goal-assignment"
              class="text-sm font-medium text-highlighted"
            >
              Assignment
            </label>
            <USelect
              id="goal-assignment"
              v-model="goalUserId"
              class="w-full"
              :items="assignmentOptions"
              :disabled="isDisabled"
            />
          </div>

          <div class="space-y-2">
            <label
              for="goal-target-type"
              class="text-sm font-medium text-highlighted"
            >
              Target type
            </label>
            <USelect
              id="goal-target-type"
              v-model="goalTargetType"
              class="w-full"
              :items="targetTypeOptions"
              :disabled="isDisabled"
            />
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <label
              for="goal-start-date"
              class="text-sm font-medium text-highlighted"
            >
              Start date
            </label>
            <AppDatePicker
              id="goal-start-date"
              v-model="goalStartDate"
              empty-label="Select start date"
              :disabled="isDisabled"
            />
          </div>

          <div class="space-y-2">
            <label
              for="goal-end-date"
              class="text-sm font-medium text-highlighted"
            >
              End date
            </label>
            <AppDatePicker
              id="goal-end-date"
              v-model="goalEndDate"
              empty-label="No end date"
              clearable
              clear-aria-label="Clear end date"
              :disabled="isDisabled"
            />
          </div>
        </div>

        <div class="space-y-2">
          <label
            for="goal-target-amount"
            class="text-sm font-medium text-highlighted"
          >
            Target amount
          </label>
          <UInput
            id="goal-target-amount"
            v-model="goalTargetAmount"
            class="w-full"
            icon="i-lucide-dollar-sign"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            :disabled="isDisabled"
          />
        </div>

        <UCheckbox
          v-model="goalIncludeInBudget"
          label="Include in budget"
          :disabled="isDisabled"
        />

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
          :label="isEditing ? 'Save goal' : 'Create goal'"
          :disabled="!canSave"
          :loading="isSaving"
          @click="emit('save')"
        />
      </div>
    </template>
  </UModal>
</template>
