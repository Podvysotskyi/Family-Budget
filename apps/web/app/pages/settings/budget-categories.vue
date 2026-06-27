<script setup lang="ts">
import type { BudgetCategory } from '~/stores/budget-categories'

defineOptions({
  name: 'BudgetCategoriesSettingsPage'
})

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})

const newBudgetCategoryName = ref('')
const editingBudgetCategoryId = ref<string | null>(null)
const editingBudgetCategoryName = ref('')
const budgetCategoryError = ref<string | null>(null)
const isCreatingBudgetCategory = ref(false)
const budgetCategoryPendingDelete = ref<BudgetCategory | null>(null)
const deletingBudgetCategoryId = ref<string | null>(null)
const reorderingBudgetCategoryId = ref<string | null>(null)
const updatingBudgetCategoryId = ref<string | null>(null)
const dashboardStore = useDashboardStore()
const budgetCategoriesStore = useBudgetCategoriesStore()
await dashboardStore.fetchDashboard()
const householdId = computed(() => dashboardStore.householdId)
const pending = computed(() => budgetCategoriesStore.isLoading(householdId.value))
const error = computed(() => budgetCategoriesStore.getError(householdId.value))
const budgetCategories = computed(() => budgetCategoriesStore.getCategories(householdId.value))
const trimmedNewBudgetCategoryName = computed(() => newBudgetCategoryName.value.trim())
const trimmedEditingBudgetCategoryName = computed(() => editingBudgetCategoryName.value.trim())

if (householdId.value) {
  await refresh()
}

watch(householdId, async (id) => {
  if (id) {
    await refresh()
  }
})

async function refresh() {
  await budgetCategoriesStore.fetchCategories(householdId.value)
}

async function createBudgetCategory() {
  budgetCategoryError.value = null

  if (!householdId.value) {
    budgetCategoryError.value = 'Household is required.'
    return
  }

  if (!trimmedNewBudgetCategoryName.value) {
    budgetCategoryError.value = 'Budget category name is required.'
    return
  }

  isCreatingBudgetCategory.value = true

  try {
    await budgetCategoriesStore.createCategory(householdId.value, trimmedNewBudgetCategoryName.value)
    newBudgetCategoryName.value = ''
  } catch {
    budgetCategoryError.value = 'Budget category could not be created.'
  } finally {
    isCreatingBudgetCategory.value = false
  }
}

function startEditingBudgetCategory(category: BudgetCategory) {
  budgetCategoryError.value = null
  editingBudgetCategoryId.value = category.id
  editingBudgetCategoryName.value = category.name
}

function cancelEditingBudgetCategory() {
  editingBudgetCategoryId.value = null
  editingBudgetCategoryName.value = ''
}

function startDeletingBudgetCategory(category: BudgetCategory) {
  budgetCategoryError.value = null
  budgetCategoryPendingDelete.value = category
}

function cancelDeletingBudgetCategory() {
  budgetCategoryPendingDelete.value = null
}

async function updateBudgetCategory(category: BudgetCategory) {
  budgetCategoryError.value = null

  if (!householdId.value) {
    budgetCategoryError.value = 'Household is required.'
    return
  }

  if (!trimmedEditingBudgetCategoryName.value) {
    budgetCategoryError.value = 'Budget category name is required.'
    return
  }

  if (trimmedEditingBudgetCategoryName.value === category.name.trim()) {
    cancelEditingBudgetCategory()
    return
  }

  updatingBudgetCategoryId.value = category.id

  try {
    await budgetCategoriesStore.updateCategory(householdId.value, category.id, trimmedEditingBudgetCategoryName.value)
    cancelEditingBudgetCategory()
  } catch {
    budgetCategoryError.value = 'Budget category could not be saved.'
  } finally {
    updatingBudgetCategoryId.value = null
  }
}

async function deleteBudgetCategory() {
  budgetCategoryError.value = null

  if (!budgetCategoryPendingDelete.value) {
    return
  }

  if (!householdId.value) {
    budgetCategoryError.value = 'Household is required.'
    return
  }

  deletingBudgetCategoryId.value = budgetCategoryPendingDelete.value.id

  try {
    await budgetCategoriesStore.deleteCategory(householdId.value, budgetCategoryPendingDelete.value.id)
    cancelDeletingBudgetCategory()
  } catch {
    budgetCategoryError.value = 'Budget category could not be deleted.'
  } finally {
    deletingBudgetCategoryId.value = null
  }
}

async function reorderBudgetCategory(category: BudgetCategory, direction: 'up' | 'down') {
  budgetCategoryError.value = null

  if (!householdId.value) {
    budgetCategoryError.value = 'Household is required.'
    return
  }

  reorderingBudgetCategoryId.value = category.id

  try {
    await budgetCategoriesStore.reorderCategory(householdId.value, category.id, direction)
  } catch {
    budgetCategoryError.value = 'Budget category order could not be updated.'
  } finally {
    reorderingBudgetCategoryId.value = null
  }
}
</script>

<template>
  <UContainer class="py-6">
    <div class="mb-6">
      <h1 class="text-2xl font-semibold tracking-normal text-highlighted">
        Budget categories
      </h1>
      <p class="mt-1 text-sm text-muted">
        Manage category names and ordering for this household.
      </p>
    </div>

    <section class="rounded-lg border border-default bg-default">
      <form
        class="flex flex-col gap-3 p-5 sm:flex-row sm:items-start"
        @submit.prevent="createBudgetCategory"
      >
        <div class="min-w-0 flex-1">
          <label
            for="budget-category-name"
            class="sr-only"
          >
            Budget category name
          </label>
          <UInput
            id="budget-category-name"
            v-model="newBudgetCategoryName"
            class="w-full"
            placeholder="New category"
            :disabled="pending || isCreatingBudgetCategory || !householdId"
          />
          <p
            v-if="budgetCategoryError"
            class="mt-2 text-sm text-error"
          >
            {{ budgetCategoryError }}
          </p>
        </div>
        <UButton
          class="w-fit"
          type="submit"
          icon="i-lucide-plus"
          color="primary"
          label="Create"
          :disabled="pending || !trimmedNewBudgetCategoryName || !householdId"
          :loading="isCreatingBudgetCategory"
        />
      </form>

      <div
        v-if="pending"
        class="space-y-3 px-5 pb-5"
      >
        <USkeleton class="h-12 w-full" />
        <USkeleton class="h-12 w-full" />
      </div>

      <div
        v-else-if="error || !householdId"
        class="border-t border-default px-5 py-4 text-sm text-muted"
      >
        <UAlert
          color="error"
          variant="subtle"
          icon="i-lucide-database"
          title="Budget categories are unavailable"
          description="Check that your user has a household."
        />
      </div>

      <div
        v-else-if="budgetCategories.length"
        class="divide-y divide-default border-t border-default"
      >
        <div
          v-for="category in budgetCategories"
          :key="category.id"
          class="px-5 py-4"
        >
          <form
            v-if="editingBudgetCategoryId === category.id"
            class="flex flex-col gap-3 sm:flex-row sm:items-center"
            @submit.prevent="updateBudgetCategory(category)"
          >
            <UInput
              v-model="editingBudgetCategoryName"
              class="min-w-0 flex-1"
              :disabled="updatingBudgetCategoryId === category.id"
            />
            <div class="flex gap-2">
              <UButton
                type="submit"
                icon="i-lucide-check"
                color="primary"
                aria-label="Save budget category"
                :disabled="!trimmedEditingBudgetCategoryName"
                :loading="updatingBudgetCategoryId === category.id"
              />
              <UButton
                type="button"
                color="neutral"
                variant="ghost"
                icon="i-lucide-x"
                aria-label="Cancel budget category edit"
                :disabled="updatingBudgetCategoryId === category.id"
                @click="cancelEditingBudgetCategory"
              />
            </div>
          </form>

          <div
            v-else
            class="flex items-center justify-between gap-3"
          >
            <div class="flex min-w-0 items-center gap-3">
              <span class="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted">
                {{ category.order }}
              </span>
              <p class="truncate text-sm font-medium text-highlighted">
                {{ category.name }}
              </p>
            </div>
            <div class="flex items-center gap-1">
              <UButton
                icon="i-lucide-chevron-up"
                color="neutral"
                variant="ghost"
                aria-label="Move budget category up"
                :disabled="category.order === 1 || reorderingBudgetCategoryId === category.id || deletingBudgetCategoryId === category.id"
                @click="reorderBudgetCategory(category, 'up')"
              />
              <UButton
                icon="i-lucide-chevron-down"
                color="neutral"
                variant="ghost"
                aria-label="Move budget category down"
                :disabled="category.order === budgetCategories.length || reorderingBudgetCategoryId === category.id || deletingBudgetCategoryId === category.id"
                @click="reorderBudgetCategory(category, 'down')"
              />
              <UButton
                icon="i-lucide-pencil"
                color="neutral"
                variant="ghost"
                aria-label="Edit budget category"
                :disabled="reorderingBudgetCategoryId === category.id || deletingBudgetCategoryId === category.id"
                @click="startEditingBudgetCategory(category)"
              />
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                aria-label="Delete budget category"
                :disabled="reorderingBudgetCategoryId === category.id || deletingBudgetCategoryId === category.id"
                @click="startDeletingBudgetCategory(category)"
              />
            </div>
          </div>
        </div>
      </div>

      <div
        v-else
        class="border-t border-default px-5 py-4 text-sm text-muted"
      >
        No budget categories found.
      </div>
    </section>

    <ConfirmationModal
      :open="Boolean(budgetCategoryPendingDelete)"
      title="Delete budget category"
      :description="budgetCategoryPendingDelete ? `Delete ${budgetCategoryPendingDelete.name}?` : ''"
      confirm-label="Delete"
      :is-confirming="Boolean(deletingBudgetCategoryId)"
      @update:open="value => !value && cancelDeletingBudgetCategory()"
      @confirm="deleteBudgetCategory"
    >
      This category will be removed from the household budget setup.
    </ConfirmationModal>
  </UContainer>
</template>
