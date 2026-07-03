<script setup lang="ts">
import type { BudgetCategory } from '~/types/budget-categories'
import type { BudgetCreditCard } from '~/types/budgets'

defineOptions({
  name: 'BudgetCategoryCreditCardsCard'
})

const props = defineProps<{
  category: BudgetCategory
  creditCards?: BudgetCreditCard[]
  creditCardsError?: string | null
  isLoadingCreditCards?: boolean
  isSummaryUpdating?: boolean
}>()
const emit = defineEmits<{
  updateSummaryInclusion: [includeInSummary: boolean]
}>()

const creditCards = computed(() => props.creditCards || [])
const creditCardsTotal = computed(() => creditCards.value.reduce((total, creditCard) => total + creditCard.amount, 0))

function formatCurrency(value: number | null) {
  if (value === null) {
    return 'No amount'
  }

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value)
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString(undefined, {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="mb-4 break-inside-avoid">
    <UCard :ui="{ header: 'p-5 sm:px-5', body: 'p-0 sm:p-0', footer: 'p-4 sm:px-5' }">
      <template #header>
        <div class="flex items-start justify-between gap-3">
          <h3 class="truncate text-sm font-semibold text-highlighted">
            {{ category.name }}
          </h3>
          <div class="flex shrink-0 items-center gap-3">
            <p class="text-sm font-semibold text-error">
              {{ formatCurrency(creditCardsTotal) }}
            </p>
          </div>
        </div>
      </template>

      <div class="px-4 py-2">
        <div
          v-if="isLoadingCreditCards && !creditCards.length"
          class="space-y-2 py-1"
        >
          <USkeleton class="h-10 w-full" />
          <USkeleton class="h-10 w-full" />
        </div>

        <UAlert
          v-else-if="creditCardsError"
          color="error"
          variant="subtle"
          icon="i-lucide-database"
          title="Credit cards are unavailable"
          :description="creditCardsError"
        />

        <div
          v-else-if="creditCards.length"
          class="divide-y divide-default"
        >
          <div
            v-for="creditCard in creditCards"
            :key="`${creditCard.id}:${creditCard.occurrenceDate}`"
            class="flex items-center justify-between gap-3 py-2"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-highlighted">
                {{ creditCard.name }}
              </p>
              <p class="mt-0.5 text-xs text-muted">
                Due {{ formatDate(creditCard.occurrenceDate) }} · Limit {{ formatCurrency(creditCard.limit) }}
              </p>
            </div>
            <p class="shrink-0 text-sm font-semibold text-highlighted">
              {{ formatCurrency(creditCard.amount) }}
            </p>
          </div>
        </div>

        <p
          v-else
          class="text-sm text-muted"
        >
          No credit cards for this period.
        </p>
      </div>

      <template
        v-if="category.summaryInclusionEditable"
        #footer
      >
        <div class="flex items-center justify-end">
          <USwitch
            :model-value="category.includeInSummary"
            label="Include in summary"
            :disabled="isSummaryUpdating"
            @update:model-value="emit('updateSummaryInclusion', $event)"
          />
        </div>
      </template>
    </UCard>
  </div>
</template>
