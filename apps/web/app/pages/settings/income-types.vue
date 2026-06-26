<script setup lang="ts">
defineOptions({
  name: 'IncomeTypesSettingsPage'
})

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})

type IncomeType = {
  id: string
  householdId: string
  text: string
  createdAt: string
  updatedAt: string
}

const newIncomeTypeText = ref('')
const editingIncomeTypeId = ref<string | null>(null)
const editingIncomeTypeText = ref('')
const incomeTypeError = ref<string | null>(null)
const isCreatingIncomeType = ref(false)
const updatingIncomeTypeId = ref<string | null>(null)
const confirmingDeleteIncomeTypeId = ref<string | null>(null)
const deletingIncomeTypeId = ref<string | null>(null)
const { data: dashboardData } = await useApiFetch<{
  household: {
    householdId: string
  } | null
}>('/dashboard')
const householdId = computed(() => dashboardData.value?.household?.householdId || '')
const data = ref<{
  incomeTypes: IncomeType[]
} | null>(null)
const pending = ref(false)
const error = ref<unknown>(null)
const incomeTypes = computed(() => data.value?.incomeTypes || [])
const trimmedNewIncomeTypeText = computed(() => newIncomeTypeText.value.trim())
const trimmedEditingIncomeTypeText = computed(() => editingIncomeTypeText.value.trim())

if (householdId.value) {
  await refresh()
}

watch(householdId, async (id) => {
  if (id) {
    await refresh()
  }
})

async function refresh() {
  error.value = null

  if (!householdId.value) {
    data.value = null
    return
  }

  pending.value = true

  try {
    data.value = await $fetch<{
      incomeTypes: IncomeType[]
    }>(`/households/${householdId.value}/income-types`, {
      baseURL: '/api',
      credentials: 'include'
    })
  } catch (fetchError) {
    error.value = fetchError
  } finally {
    pending.value = false
  }
}

async function createIncomeType() {
  incomeTypeError.value = null

  if (!householdId.value) {
    incomeTypeError.value = 'Household is required.'
    return
  }

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
    await refresh()
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

  if (!householdId.value) {
    incomeTypeError.value = 'Household is required.'
    return
  }

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
    await refresh()
  } catch {
    incomeTypeError.value = 'Income type could not be saved.'
  } finally {
    updatingIncomeTypeId.value = null
  }
}

async function deleteIncomeType(incomeType: IncomeType) {
  incomeTypeError.value = null

  if (!householdId.value) {
    incomeTypeError.value = 'Household is required.'
    return
  }

  deletingIncomeTypeId.value = incomeType.id

  try {
    await $fetch(`/households/${householdId.value}/income-types/${incomeType.id}`, {
      baseURL: '/api',
      method: 'DELETE',
      credentials: 'include'
    })
    cancelDeletingIncomeType()
    await refresh()
  } catch {
    incomeTypeError.value = 'Income type could not be deleted.'
  } finally {
    deletingIncomeTypeId.value = null
  }
}
</script>

<template>
  <UContainer class="py-6">
    <div class="mb-6">
      <h1 class="text-2xl font-semibold tracking-normal text-highlighted">
        Income types
      </h1>
      <p class="mt-1 text-sm text-muted">
        Manage reusable income labels for this household.
      </p>
    </div>

    <section class="rounded-lg border border-default bg-default">
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
            :disabled="pending || isCreatingIncomeType || !householdId"
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
          :disabled="pending || !trimmedNewIncomeTypeText || !householdId"
          :loading="isCreatingIncomeType"
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
          title="Income types are unavailable"
          description="Check that your user has a household."
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
</template>
