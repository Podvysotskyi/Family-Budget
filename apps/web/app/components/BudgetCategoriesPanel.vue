<script setup lang="ts">
defineOptions({
  name: 'BudgetCategoriesPanel'
})

const props = defineProps<{
  householdId: string
}>()

const budgetCategoriesStore = useBudgetCategoriesStore()
await budgetCategoriesStore.fetchCategories(props.householdId)

const error = computed(() => budgetCategoriesStore.getError(props.householdId))
const budgetCategories = computed(() => budgetCategoriesStore.getCategories(props.householdId))
</script>

<template>
  <section class="mt-6 rounded-lg border border-default bg-default">
    <div class="border-b border-default px-5 py-4">
      <h2 class="text-base font-semibold text-highlighted">
        Budget categories
      </h2>
    </div>

    <div class="p-5">
      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        icon="i-lucide-database"
        title="Budget categories are unavailable"
        description="Check that this household is available."
      />

      <div
        v-else-if="budgetCategories.length"
        class="grid gap-4 md:grid-cols-2"
      >
        <section
          v-for="category in budgetCategories"
          :key="category.id"
          class="rounded-lg border border-default p-5"
        >
          <div class="flex items-center gap-3">
            <span class="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted">
              {{ category.order }}
            </span>
            <div class="min-w-0">
              <h3 class="truncate text-sm font-semibold text-highlighted">
                {{ category.name }}
              </h3>
              <p class="mt-1 text-sm text-muted">
                No budget items yet.
              </p>
            </div>
          </div>
        </section>
      </div>

      <div
        v-else
        class="text-sm text-muted"
      >
        No budget categories found.
      </div>
    </div>
  </section>
</template>
