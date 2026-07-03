<script setup lang="ts">
import type { BudgetCategory } from '~/types/budget-categories'

defineOptions({
  name: 'BudgetCategoryCustomCard'
})

defineProps<{
  category: BudgetCategory
  isSummaryUpdating?: boolean
}>()
defineEmits<{
  updateSummaryInclusion: [includeInSummary: boolean]
}>()
</script>

<template>
  <div class="mb-4 break-inside-avoid">
    <UCard :ui="{ header: 'p-5 sm:px-5', body: 'p-0 sm:p-0', footer: 'p-4 sm:px-5' }">
      <template #header>
        <h3 class="truncate text-sm font-semibold text-highlighted">
          {{ category.name }}
        </h3>
      </template>

      <div class="px-4 py-2">
        <p class="text-sm text-muted">
          No budget items yet.
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
            @update:model-value="$emit('updateSummaryInclusion', $event)"
          />
        </div>
      </template>
    </UCard>
  </div>
</template>
