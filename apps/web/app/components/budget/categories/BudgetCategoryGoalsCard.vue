<script setup lang="ts">
import type { BudgetCategory } from '~/types/budget-categories'
import type { BudgetGoal } from '~/types/budgets'

defineOptions({
  name: 'BudgetCategoryGoalsCard'
})

const props = defineProps<{
  category: BudgetCategory
  goals?: BudgetGoal[]
  goalsError?: string | null
  isLoadingGoals?: boolean
  isSummaryUpdating?: boolean
}>()
const emit = defineEmits<{
  updateSummaryInclusion: [includeInSummary: boolean]
}>()

const goals = computed(() => props.goals || [])
const goalsTotal = computed(() => goals.value.reduce((total, goal) => total + goal.amount, 0))

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value)
}

function getTargetTypeLabel(type: BudgetGoal['targetType']) {
  if (type === 'weekly') {
    return 'Weekly'
  }

  if (type === 'total') {
    return 'Total'
  }

  return 'Monthly'
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
              {{ formatCurrency(goalsTotal) }}
            </p>
          </div>
        </div>
      </template>

      <div class="px-4 py-2">
        <div
          v-if="isLoadingGoals && !goals.length"
          class="space-y-2 py-1"
        >
          <USkeleton class="h-10 w-full" />
          <USkeleton class="h-10 w-full" />
        </div>

        <UAlert
          v-else-if="goalsError"
          color="error"
          variant="subtle"
          icon="i-lucide-database"
          title="Goals are unavailable"
          :description="goalsError"
        />

        <div
          v-else-if="goals.length"
          class="divide-y divide-default"
        >
          <div
            v-for="goal in goals"
            :key="`${goal.id}:${goal.occurrenceDate}`"
            class="flex items-center justify-between gap-3 py-2"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-highlighted">
                {{ goal.name }}
              </p>
              <p class="mt-0.5 text-xs text-muted">
                {{ getTargetTypeLabel(goal.targetType) }} target
              </p>
            </div>
            <p class="shrink-0 text-sm font-semibold text-highlighted">
              {{ formatCurrency(goal.amount) }}
            </p>
          </div>
        </div>

        <p
          v-else
          class="text-sm text-muted"
        >
          No goals for this period.
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
