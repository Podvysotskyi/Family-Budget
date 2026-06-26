<script setup lang="ts">
defineOptions({
  name: 'DashboardPage'
})

definePageMeta({
  middleware: 'auth'
})

const signOut = useSignOut()
const { data, pending, error } = await useApiFetch<{
  user: {
    id: string
    email: string
    name?: string | null
  }
  household: {
    householdId: string
    householdName: string
    joinedAt: string
  } | null
  members: Array<{
    userId: string
    name?: string | null
    email: string
    joinedAt: string
  }>
}>('/dashboard')
</script>

<template>
  <div class="min-h-screen">
    <header class="border-b border-default bg-default">
      <UContainer class="flex h-16 items-center justify-between gap-4">
        <div class="flex min-w-0 items-center gap-3">
          <div class="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-inverted">
            <UIcon
              name="i-lucide-wallet-cards"
              class="size-5"
            />
          </div>
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-highlighted">
              Family Budget
            </p>
            <p class="truncate text-xs text-muted">
              Household
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
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <h1 class="text-2xl font-semibold tracking-normal text-highlighted">
            Dashboard
          </h1>
          <p class="mt-1 text-sm text-muted">
            Welcome back, {{ data?.user.name || 'there' }}. Open your household workspace.
          </p>
        </div>
      </div>

      <UAlert
        v-if="error"
        class="mb-6"
        color="error"
        variant="subtle"
        icon="i-lucide-database"
        title="Dashboard data is unavailable"
        description="Check DATABASE_URL and confirm the database schema is available before using the app."
      />

      <section class="rounded-lg border border-default bg-default">
        <div class="flex items-center justify-between gap-3 border-b border-default px-5 py-4">
          <h2 class="text-base font-semibold text-highlighted">
            Your household
          </h2>
          <UButton
            v-if="data?.household"
            :to="`/households/${data.household.householdId}/settings`"
            icon="i-lucide-settings"
            color="neutral"
            variant="ghost"
            aria-label="Household settings"
          />
        </div>

        <div
          v-if="pending"
          class="space-y-3 p-5"
        >
          <USkeleton class="h-12 w-full" />
        </div>

        <div
          v-else-if="data?.household"
          class="divide-y divide-default"
        >
          <div
            v-for="member in data.members"
            :key="member.userId"
            class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-highlighted">
                {{ member.name || member.email }}
              </p>
              <p class="mt-1 text-xs text-muted">
                Joined {{ new Date(member.joinedAt).toLocaleDateString() }}
              </p>
            </div>
            <UButton
              class="w-fit sm:ml-auto"
              :to="`/users/${member.userId}/budget`"
              icon="i-lucide-wallet-cards"
              color="neutral"
              variant="outline"
              label="Open"
            />
          </div>
        </div>

        <div
          v-else
          class="p-5 text-sm text-muted"
        >
          No household found.
        </div>
      </section>
    </UContainer>
  </div>
</template>
