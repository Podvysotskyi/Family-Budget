<script setup lang="ts">
defineOptions({
  name: 'HouseholdSettingsPage'
})

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})

const householdName = ref('')
const isSavingHouseholdName = ref(false)
const householdNameError = ref<string | null>(null)
const { data, pending, error } = await useApiFetch<{
  household: {
    householdId: string
    householdName: string
  } | null
}>('/dashboard')
const householdId = computed(() => data.value?.household?.householdId || '')
const savedHouseholdName = computed(() => data.value?.household?.householdName || '')
const trimmedHouseholdName = computed(() => householdName.value.trim())
const isHouseholdNameUnchanged = computed(() => trimmedHouseholdName.value === savedHouseholdName.value.trim())

watch(savedHouseholdName, (name) => {
  householdName.value = name
}, { immediate: true })

async function saveHouseholdName() {
  householdNameError.value = null

  if (!householdId.value) {
    householdNameError.value = 'Household is required.'
    return
  }

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

    if (data.value?.household) {
      data.value.household.householdName = response.household.householdName
    }

    householdName.value = response.household.householdName
  } catch {
    householdNameError.value = 'Household name could not be saved.'
  } finally {
    isSavingHouseholdName.value = false
  }
}
</script>

<template>
  <UContainer class="py-6">
    <div class="mb-6">
      <h1 class="text-2xl font-semibold tracking-normal text-highlighted">
        Household
      </h1>
      <p class="mt-1 text-sm text-muted">
        Manage the household name shown across your workspace.
      </p>
    </div>

    <section class="rounded-lg border border-default bg-default">
      <div
        v-if="error || !data?.household"
        class="p-5 text-sm text-muted"
      >
        <UAlert
          color="error"
          variant="subtle"
          icon="i-lucide-database"
          title="Household settings are unavailable"
          description="Check that your user has a household."
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
  </UContainer>
</template>
