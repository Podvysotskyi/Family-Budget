<script setup lang="ts">
defineOptions({
  name: 'AddIncomeModal'
})

type IncomeType = {
  id: string
  text: string
}

type ExistingIncome = {
  id: string
  amount: number
  incomeTypeText: string
}

type AddIncomePayload = {
  amount: number
  incomeTypeId?: string
  newIncomeTypeText?: string
}

const props = withDefaults(defineProps<{
  error?: string
  existingIncomes: ExistingIncome[]
  incomeTotal: number
  isLoadingIncomeTypes?: boolean
  incomeTypes: IncomeType[]
  isSubmitting?: boolean
  periodLabel: string
  open: boolean
}>(), {
  error: '',
  isLoadingIncomeTypes: false,
  isSubmitting: false
})

const emit = defineEmits<{
  'submit': [payload: AddIncomePayload]
  'update:open': [value: boolean]
}>()

const selectedIncomeTypeId = ref<string | undefined>(undefined)
const incomeAmount = ref('')
const isCreatingNewIncomeType = ref(false)
const localError = ref('')
const newIncomeTypeText = ref('')
const incomeTypeOptions = computed(() => {
  return props.incomeTypes.map(incomeType => ({
    label: incomeType.text,
    value: incomeType.id
  }))
})
const displayedError = computed(() => props.error || localError.value)

watch(() => props.open, (open) => {
  if (open) {
    resetForm()
  }
})

function closeModal() {
  emit('update:open', false)
}

function resetForm() {
  selectedIncomeTypeId.value = props.incomeTypes[0]?.id
  incomeAmount.value = ''
  isCreatingNewIncomeType.value = false
  localError.value = ''
  newIncomeTypeText.value = ''
}

function submit() {
  const amount = Number(incomeAmount.value)
  const trimmedNewIncomeTypeText = newIncomeTypeText.value.trim()

  localError.value = ''

  if (isCreatingNewIncomeType.value) {
    if (!trimmedNewIncomeTypeText) {
      localError.value = 'Income type name is required.'
      return
    }
  } else if (!selectedIncomeTypeId.value) {
    localError.value = 'Income type is required.'
    return
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    localError.value = 'Income amount must be greater than zero.'
    return
  }

  emit('submit', {
    amount,
    incomeTypeId: isCreatingNewIncomeType.value ? undefined : selectedIncomeTypeId.value,
    newIncomeTypeText: isCreatingNewIncomeType.value ? trimmedNewIncomeTypeText : undefined
  })
}
</script>

<template>
  <UModal
    :open="open"
    title="Add income"
    :description="periodLabel"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <form
        class="space-y-4"
        @submit.prevent="submit"
      >
        <div class="space-y-2">
          <label class="text-sm font-medium text-highlighted">
            Income type
          </label>

          <div
            v-if="isCreatingNewIncomeType"
            class="flex items-center gap-2"
          >
            <UInput
              id="new-income-type"
              v-model="newIncomeTypeText"
              class="min-w-0 flex-1"
              placeholder="Paycheck"
              :disabled="isSubmitting"
            />
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              aria-label="Use existing income type"
              :disabled="isSubmitting"
              @click="isCreatingNewIncomeType = false; newIncomeTypeText = ''"
            />
          </div>

          <template v-else>
            <div class="flex items-center gap-2">
              <USelect
                v-model="selectedIncomeTypeId"
                class="min-w-0 flex-1"
                :items="incomeTypeOptions"
                placeholder="Select income type"
                :disabled="isSubmitting || isLoadingIncomeTypes"
              />
              <UButton
                type="button"
                icon="i-lucide-plus"
                color="neutral"
                variant="ghost"
                aria-label="Create new income type"
                :disabled="isSubmitting || isLoadingIncomeTypes"
                @click="isCreatingNewIncomeType = true"
              />
            </div>
            <p
              v-if="isLoadingIncomeTypes"
              class="text-sm text-muted"
            >
              Loading income types...
            </p>
            <p
              v-else-if="!incomeTypeOptions.length"
              class="text-sm text-muted"
            >
              No income types yet.
            </p>
          </template>
        </div>

        <div class="space-y-2">
          <label
            for="income-amount"
            class="text-sm font-medium text-highlighted"
          >
            Amount
          </label>
          <UInput
            id="income-amount"
            v-model="incomeAmount"
            class="w-full"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            :disabled="isSubmitting"
          />
        </div>

        <p
          v-if="displayedError"
          class="text-sm text-error"
        >
          {{ displayedError }}
        </p>

        <div
          v-if="existingIncomes.length"
          class="space-y-2 rounded-lg border border-default p-3"
        >
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-medium text-highlighted">
              Current income
            </p>
            <p class="text-sm font-semibold text-highlighted">
              {{ new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }).format(incomeTotal) }}
            </p>
          </div>

          <div class="space-y-2">
            <div
              v-for="income in existingIncomes"
              :key="income.id"
              class="flex items-center justify-between gap-3 text-sm"
            >
              <span class="truncate text-muted">
                {{ income.incomeTypeText }}
              </span>
              <span class="shrink-0 font-medium text-highlighted">
                {{ new Intl.NumberFormat(undefined, {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }).format(income.amount) }}
              </span>
            </div>
          </div>
        </div>
      </form>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          label="Cancel"
          :disabled="isSubmitting"
          @click="closeModal"
        />
        <UButton
          color="primary"
          label="Add income"
          :loading="isSubmitting"
          @click="submit"
        />
      </div>
    </template>
  </UModal>
</template>
