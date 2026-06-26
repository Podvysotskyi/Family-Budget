<script setup lang="ts">
defineOptions({
  name: 'HouseholdSettingsPage'
})

definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const signOut = useSignOut()
const householdId = computed(() => String(route.params.id))
const householdName = ref('')
const isSavingHouseholdName = ref(false)
const householdNameError = ref<string | null>(null)
const newBudgetCategoryName = ref('')
const editingBudgetCategoryId = ref<string | null>(null)
const editingBudgetCategoryName = ref('')
const budgetCategoryError = ref<string | null>(null)
const isCreatingBudgetCategory = ref(false)
const reorderingBudgetCategoryId = ref<string | null>(null)
const updatingBudgetCategoryId = ref<string | null>(null)
const newIncomeTypeText = ref('')
const editingIncomeTypeId = ref<string | null>(null)
const editingIncomeTypeText = ref('')
const incomeTypeError = ref<string | null>(null)
const isCreatingIncomeType = ref(false)
const updatingIncomeTypeId = ref<string | null>(null)
const confirmingDeleteIncomeTypeId = ref<string | null>(null)
const deletingIncomeTypeId = ref<string | null>(null)
const { data, pending, error } = await useApiFetch<{
  household: {
    householdId: string
    householdName: string
  }
}>(() => `/households/${householdId.value}/dashboard`)
const { data: budgetCategoriesData, pending: budgetCategoriesPending, error: budgetCategoriesLoadError, refresh: refreshBudgetCategories } = await useApiFetch<{
  categories: BudgetCategory[]
}>(() => `/households/${householdId.value}/budget-categories`)
const { data: incomeTypesData, pending: incomeTypesPending, error: incomeTypesLoadError, refresh: refreshIncomeTypes } = await useApiFetch<{
  incomeTypes: IncomeType[]
}>(() => `/households/${householdId.value}/income-types`)
type BudgetCategory = {
  id: string
  householdId: string
  name: string
  order: number
  createdAt: string
  updatedAt: string
}
type IncomeType = {
  id: string
  householdId: string
  text: string
  createdAt: string
  updatedAt: string
}
const savedHouseholdName = computed(() => data.value?.household.householdName || '')
const trimmedHouseholdName = computed(() => householdName.value.trim())
const isHouseholdNameUnchanged = computed(() => trimmedHouseholdName.value === savedHouseholdName.value.trim())
const budgetCategories = computed(() => budgetCategoriesData.value?.categories || [])
const trimmedNewBudgetCategoryName = computed(() => newBudgetCategoryName.value.trim())
const trimmedEditingBudgetCategoryName = computed(() => editingBudgetCategoryName.value.trim())
const incomeTypes = computed(() => incomeTypesData.value?.incomeTypes || [])
const trimmedNewIncomeTypeText = computed(() => newIncomeTypeText.value.trim())
const trimmedEditingIncomeTypeText = computed(() => editingIncomeTypeText.value.trim())

watch(savedHouseholdName, (name) => {
  householdName.value = name
}, { immediate: true })

async function saveHouseholdName() {
  householdNameError.value = null

  if (!trimmedHouseholdName.value) {
    householdNameError.value = 'Household name is required.'
    return
  }

  isSavingHouseholdName.value = true

  try {
    const response = await $fetch<{
      household: {
        householdId: string
        householdName: string
      }
    }>(`/households/${householdId.value}`, {
      baseURL: '/api',
      method: 'PATCH',
      credentials: 'include',
      body: {
        name: trimmedHouseholdName.value
      }
    })

    if (data.value) {
      data.value.household.householdName = response.household.householdName
    }

    householdName.value = response.household.householdName
  } catch {
    householdNameError.value = 'Household name could not be saved.'
  } finally {
    isSavingHouseholdName.value = false
  }
}

async function createBudgetCategory() {
  budgetCategoryError.value = null

  if (!trimmedNewBudgetCategoryName.value) {
    budgetCategoryError.value = 'Budget category name is required.'
    return
  }

  isCreatingBudgetCategory.value = true

  try {
    await $fetch(`/households/${householdId.value}/budget-categories`, {
      baseURL: '/api',
      method: 'POST',
      credentials: 'include',
      body: {
        name: trimmedNewBudgetCategoryName.value
      }
    })
    newBudgetCategoryName.value = ''
    await refreshBudgetCategories()
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

async function updateBudgetCategory(category: BudgetCategory) {
  budgetCategoryError.value = null

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
    await $fetch(`/households/${householdId.value}/budget-categories/${category.id}`, {
      baseURL: '/api',
      method: 'PATCH',
      credentials: 'include',
      body: {
        name: trimmedEditingBudgetCategoryName.value
      }
    })
    cancelEditingBudgetCategory()
    await refreshBudgetCategories()
  } catch {
    budgetCategoryError.value = 'Budget category could not be saved.'
  } finally {
    updatingBudgetCategoryId.value = null
  }
}

async function reorderBudgetCategory(category: BudgetCategory, direction: 'up' | 'down') {
  budgetCategoryError.value = null
  reorderingBudgetCategoryId.value = category.id

  try {
    await $fetch(`/households/${householdId.value}/budget-categories/${category.id}/order/${direction}`, {
      baseURL: '/api',
      method: 'PATCH',
      credentials: 'include'
    })
    await refreshBudgetCategories()
  } catch {
    budgetCategoryError.value = 'Budget category order could not be updated.'
  } finally {
    reorderingBudgetCategoryId.value = null
  }
}

async function createIncomeType() {
  incomeTypeError.value = null

  if (!trimmedNewIncomeTypeText.value) {
    incomeTypeError.value = 'Income type text is required.'
    return
  }

  isCreatingIncomeType.value = true

  try {
    await $fetch(`/households/${householdId.value}/income-types`, {
      baseURL: '/api',
      method: 'POST',
      credentials: 'include',
      body: {
        text: trimmedNewIncomeTypeText.value
      }
    })
    newIncomeTypeText.value = ''
    await refreshIncomeTypes()
  } catch {
    incomeTypeError.value = 'Income type could not be created.'
  } finally {
    isCreatingIncomeType.value = false
  }
}

function startEditingIncomeType(incomeType: IncomeType) {
  incomeTypeError.value = null
  editingIncomeTypeId.value = incomeType.id
  editingIncomeTypeText.value = incomeType.text
}

function cancelEditingIncomeType() {
  editingIncomeTypeId.value = null
  editingIncomeTypeText.value = ''
}

function startDeletingIncomeType(incomeType: IncomeType) {
  incomeTypeError.value = null
  confirmingDeleteIncomeTypeId.value = incomeType.id
}

function cancelDeletingIncomeType() {
  confirmingDeleteIncomeTypeId.value = null
}

async function updateIncomeType(incomeType: IncomeType) {
  incomeTypeError.value = null

  if (!trimmedEditingIncomeTypeText.value) {
    incomeTypeError.value = 'Income type text is required.'
    return
  }

  if (trimmedEditingIncomeTypeText.value === incomeType.text.trim()) {
    cancelEditingIncomeType()
    return
  }

  updatingIncomeTypeId.value = incomeType.id

  try {
    await $fetch(`/households/${householdId.value}/income-types/${incomeType.id}`, {
      baseURL: '/api',
      method: 'PATCH',
      credentials: 'include',
      body: {
        text: trimmedEditingIncomeTypeText.value
      }
    })
    cancelEditingIncomeType()
    await refreshIncomeTypes()
  } catch {
    incomeTypeError.value = 'Income type could not be saved.'
  } finally {
    updatingIncomeTypeId.value = null
  }
}

async function deleteIncomeType(incomeType: IncomeType) {
  incomeTypeError.value = null
  deletingIncomeTypeId.value = incomeType.id

  try {
    await $fetch(`/households/${householdId.value}/income-types/${incomeType.id}`, {
      baseURL: '/api',
      method: 'DELETE',
      credentials: 'include'
    })
    cancelDeletingIncomeType()
    await refreshIncomeTypes()
  } catch {
    incomeTypeError.value = 'Income type could not be deleted.'
  } finally {
    deletingIncomeTypeId.value = null
  }
}
</script>

<template>
  <div class="min-h-screen">
    <header class="border-b border-default bg-default">
      <UContainer class="flex h-16 items-center justify-between gap-4">
        <div class="flex min-w-0 items-center gap-3">
          <UButton
            to="/dashboard"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            aria-label="Back to dashboard"
          />
          <div class="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-inverted">
            <UIcon
              name="i-lucide-settings"
              class="size-5"
            />
          </div>
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-highlighted">
              {{ data?.household.householdName || 'Household' }}
            </p>
            <p class="truncate text-xs text-muted">
              Household settings
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <UColorModeButton />
          <UButton
            icon="i-lucide-log-out"
            color="neutral"
            variant="ghost"
            aria-label="Sign out"
            @click="signOut"
          />
        </div>
      </UContainer>
    </header>

    <UContainer class="py-6">
      <section class="mb-6 rounded-lg border border-default bg-default">
        <div
          v-if="error"
          class="p-5 text-sm text-muted"
        >
          <UAlert
            color="error"
            variant="subtle"
            icon="i-lucide-database"
            title="Household settings are unavailable"
            description="Check that this household exists and that your user has access."
          />
        </div>
        <form
          v-else
          class="flex flex-col gap-4 p-5 sm:flex-row sm:items-end"
          @submit.prevent="saveHouseholdName"
        >
          <div class="min-w-0 flex-1">
            <label
              for="household-name"
              class="text-sm font-medium text-muted"
            >
              Household name
            </label>
            <UInput
              id="household-name"
              v-model="householdName"
              class="mt-2 w-full"
              :disabled="pending || isSavingHouseholdName"
            />
            <p
              v-if="householdNameError"
              class="mt-2 text-sm text-error"
            >
              {{ householdNameError }}
            </p>
          </div>
          <UButton
            class="w-fit"
            type="submit"
            icon="i-lucide-save"
            color="primary"
            label="Save"
            :disabled="pending || isHouseholdNameUnchanged"
            :loading="isSavingHouseholdName"
          />
        </form>
      </section>

      <section class="mt-6 rounded-lg border border-default bg-default">
        <div class="border-b border-default px-5 py-4">
          <h2 class="text-base font-semibold text-highlighted">
            Budget categories
          </h2>
        </div>

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
              :disabled="budgetCategoriesPending || isCreatingBudgetCategory"
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
            :disabled="budgetCategoriesPending || !trimmedNewBudgetCategoryName"
            :loading="isCreatingBudgetCategory"
          />
        </form>

        <div
          v-if="budgetCategoriesPending"
          class="space-y-3 px-5 pb-5"
        >
          <USkeleton class="h-12 w-full" />
          <USkeleton class="h-12 w-full" />
        </div>

        <div
          v-else-if="budgetCategoriesLoadError"
          class="border-t border-default px-5 py-4 text-sm text-muted"
        >
          <UAlert
            color="error"
            variant="subtle"
            icon="i-lucide-database"
            title="Budget categories are unavailable"
            description="Check that the database migration has been applied."
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
                  :disabled="category.order === 1 || reorderingBudgetCategoryId === category.id"
                  @click="reorderBudgetCategory(category, 'up')"
                />
                <UButton
                  icon="i-lucide-chevron-down"
                  color="neutral"
                  variant="ghost"
                  aria-label="Move budget category down"
                  :disabled="category.order === budgetCategories.length || reorderingBudgetCategoryId === category.id"
                  @click="reorderBudgetCategory(category, 'down')"
                />
                <UButton
                  icon="i-lucide-pencil"
                  color="neutral"
                  variant="ghost"
                  aria-label="Edit budget category"
                  :disabled="reorderingBudgetCategoryId === category.id"
                  @click="startEditingBudgetCategory(category)"
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

      <section class="mt-6 rounded-lg border border-default bg-default">
        <div class="border-b border-default px-5 py-4">
          <h2 class="text-base font-semibold text-highlighted">
            Income types
          </h2>
        </div>

        <form
          class="flex flex-col gap-3 p-5 sm:flex-row sm:items-start"
          @submit.prevent="createIncomeType"
        >
          <div class="min-w-0 flex-1">
            <label
              for="income-type-text"
              class="sr-only"
            >
              Income type text
            </label>
            <UInput
              id="income-type-text"
              v-model="newIncomeTypeText"
              class="w-full"
              placeholder="New income type"
              :disabled="incomeTypesPending || isCreatingIncomeType"
            />
            <p
              v-if="incomeTypeError"
              class="mt-2 text-sm text-error"
            >
              {{ incomeTypeError }}
            </p>
          </div>
          <UButton
            class="w-fit"
            type="submit"
            icon="i-lucide-plus"
            color="primary"
            label="Create"
            :disabled="incomeTypesPending || !trimmedNewIncomeTypeText"
            :loading="isCreatingIncomeType"
          />
        </form>

        <div
          v-if="incomeTypesPending"
          class="space-y-3 px-5 pb-5"
        >
          <USkeleton class="h-12 w-full" />
          <USkeleton class="h-12 w-full" />
        </div>

        <div
          v-else-if="incomeTypesLoadError"
          class="border-t border-default px-5 py-4 text-sm text-muted"
        >
          <UAlert
            color="error"
            variant="subtle"
            icon="i-lucide-database"
            title="Income types are unavailable"
            description="Check that the database migration has been applied."
          />
        </div>

        <div
          v-else-if="incomeTypes.length"
          class="divide-y divide-default border-t border-default"
        >
          <div
            v-for="incomeType in incomeTypes"
            :key="incomeType.id"
            class="px-5 py-4"
          >
            <form
              v-if="editingIncomeTypeId === incomeType.id"
              class="flex flex-col gap-3 sm:flex-row sm:items-center"
              @submit.prevent="updateIncomeType(incomeType)"
            >
              <UInput
                v-model="editingIncomeTypeText"
                class="min-w-0 flex-1"
                :disabled="updatingIncomeTypeId === incomeType.id"
              />
              <div class="flex gap-2">
                <UButton
                  type="submit"
                  icon="i-lucide-save"
                  color="primary"
                  label="Save"
                  :disabled="!trimmedEditingIncomeTypeText"
                  :loading="updatingIncomeTypeId === incomeType.id"
                />
                <UButton
                  type="button"
                  color="neutral"
                  variant="ghost"
                  label="Cancel"
                  :disabled="updatingIncomeTypeId === incomeType.id"
                  @click="cancelEditingIncomeType"
                />
              </div>
            </form>

            <div
              v-else
              class="flex items-center justify-between gap-3"
            >
              <p class="truncate text-sm font-medium text-highlighted">
                {{ incomeType.text }}
              </p>
              <div class="flex items-center gap-1">
                <template v-if="confirmingDeleteIncomeTypeId === incomeType.id">
                  <UButton
                    icon="i-lucide-check"
                    color="error"
                    variant="ghost"
                    aria-label="Confirm delete income type"
                    :loading="deletingIncomeTypeId === incomeType.id"
                    @click="deleteIncomeType(incomeType)"
                  />
                  <UButton
                    icon="i-lucide-x"
                    color="neutral"
                    variant="ghost"
                    aria-label="Cancel delete income type"
                    :disabled="deletingIncomeTypeId === incomeType.id"
                    @click="cancelDeletingIncomeType"
                  />
                </template>

                <template v-else>
                  <UButton
                    icon="i-lucide-pencil"
                    color="neutral"
                    variant="ghost"
                    aria-label="Edit income type"
                    :disabled="deletingIncomeTypeId === incomeType.id"
                    @click="startEditingIncomeType(incomeType)"
                  />
                  <UButton
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    aria-label="Delete income type"
                    :disabled="deletingIncomeTypeId === incomeType.id"
                    @click="startDeletingIncomeType(incomeType)"
                  />
                </template>
              </div>
            </div>
          </div>
        </div>

        <div
          v-else
          class="border-t border-default px-5 py-4 text-sm text-muted"
        >
          No income types found.
        </div>
      </section>
    </UContainer>
  </div>
</template>
