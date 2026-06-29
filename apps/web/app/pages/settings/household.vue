<script setup lang="ts">
defineOptions({
  name: 'HouseholdSettingsPage'
})

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})

const householdName = ref('')
const householdNameError = ref<string | null>(null)
const dashboardStore = useDashboardStore()
const householdStore = useHouseholdStore()
await Promise.all([
  dashboardStore.fetchDashboard(),
  householdStore.isLoaded ? Promise.resolve() : householdStore.fetchHousehold()
])
const householdId = computed(() => householdStore.householdId)
const householdMembers = computed(() => householdStore.members)
const savedHouseholdName = computed(() => householdStore.householdName)
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

  try {
    const saved = await householdStore.updateHouseholdName(trimmedHouseholdName.value)

    if (!saved) {
      householdNameError.value = 'Household name could not be saved.'

      return
    }

    await dashboardStore.fetchDashboard({ force: true })
    householdName.value = savedHouseholdName.value
  } catch {
    householdNameError.value = 'Household name could not be saved.'
  }
}

function getMemberDisplayName(member: { name: string }) {
  return member.name
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
        v-if="!householdStore.isLoaded"
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
            :disabled="householdStore.isLoading || householdStore.isSaving"
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
          :disabled="householdStore.isLoading || isHouseholdNameUnchanged"
          :loading="householdStore.isSaving"
        />
      </form>
    </section>

    <section class="mt-6 rounded-lg border border-default bg-default">
      <div class="border-b border-default px-5 py-4">
        <h2 class="text-base font-semibold text-highlighted">
          Household members
        </h2>
      </div>

      <div
        v-if="!householdStore.isLoaded"
        class="p-5 text-sm text-muted"
      >
        Household members are unavailable.
      </div>

      <div
        v-else-if="householdStore.isLoading"
        class="space-y-3 p-5"
      >
        <USkeleton class="h-14 w-full" />
        <USkeleton class="h-14 w-full" />
      </div>

      <div
        v-else-if="householdMembers.length"
        class="divide-y divide-default"
      >
        <div
          v-for="member in householdMembers"
          :key="member.userId"
          class="flex items-center justify-between gap-4 px-5 py-4"
        >
          <div class="flex min-w-0 items-center gap-3">
            <UAvatar
              :src="member.avatarUrl || undefined"
              :alt="getMemberDisplayName(member)"
              size="md"
            />
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-highlighted">
                {{ getMemberDisplayName(member) }}
              </p>
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <UBadge
              v-if="member.userId === dashboardStore.user?.id"
              color="primary"
              variant="subtle"
              label="You"
            />
          </div>
        </div>
      </div>

      <div
        v-else
        class="p-5 text-sm text-muted"
      >
        No household members found.
      </div>
    </section>
  </UContainer>
</template>
