<script setup lang="ts">
defineOptions({
  name: 'LoginPage'
})

definePageMeta({
  middleware: 'guest'
})

const route = useRoute()
const hasOAuthError = computed(() => route.query.error === 'oauth')
const googleLoginUrl = '/api/auth/google'
const budgetStats = [
  {
    label: 'Income',
    value: '$7,840'
  },
  {
    label: 'Planned',
    value: '$5,910'
  },
  {
    label: 'Remaining',
    value: '$1,930'
  }
]
const weeklyPlan = [
  {
    label: 'Week 1',
    value: '$1,120',
    progress: '76%'
  },
  {
    label: 'Week 2',
    value: '$940',
    progress: '54%'
  },
  {
    label: 'Week 3',
    value: '$1,085',
    progress: '62%'
  }
]
const budgetCategories = [
  {
    name: 'Fixed Bills',
    value: '$2,140',
    icon: 'i-lucide-home'
  },
  {
    name: 'Subscriptions',
    value: '$280',
    icon: 'i-lucide-repeat-2'
  },
  {
    name: 'Savings',
    value: '$1,200',
    icon: 'i-lucide-piggy-bank'
  }
]
const highlights = [
  {
    label: 'Monthly and weekly periods',
    icon: 'i-lucide-calendar-range'
  },
  {
    label: 'Shared household categories',
    icon: 'i-lucide-list-checks'
  },
  {
    label: 'Google account sign-in',
    icon: 'i-lucide-shield-check'
  }
]
</script>

<template>
  <div class="min-h-screen bg-default lg:grid lg:grid-cols-[minmax(0,1fr)_460px]">
    <section class="flex min-h-screen flex-col px-6 py-6 lg:px-10 xl:px-12">
      <header class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-md bg-primary text-inverted">
            <UIcon
              name="i-lucide-wallet-cards"
              class="size-5"
            />
          </div>
          <div>
            <p class="text-sm font-semibold text-highlighted">
              Family Budget
            </p>
            <p class="text-xs text-muted">
              Household finance workspace
            </p>
          </div>
        </div>

        <UColorModeButton class="lg:hidden" />
      </header>

      <main class="grid flex-1 items-center gap-8 py-10 xl:grid-cols-[minmax(0,0.92fr)_minmax(380px,1.08fr)]">
        <section class="hidden min-w-0 lg:block">
          <div class="max-w-2xl">
            <p class="text-sm font-semibold uppercase tracking-normal text-primary">
              Household budget control
            </p>
            <h1 class="mt-4 text-4xl font-semibold tracking-normal text-highlighted xl:text-5xl">
              Plan the month, adjust the week, keep everyone on the same page.
            </h1>
            <p class="mt-5 max-w-xl text-base leading-7 text-muted">
              Track household income, budget categories, and active budget periods from one focused workspace.
            </p>
          </div>

          <div class="mt-6 grid gap-3 sm:grid-cols-3">
            <div
              v-for="highlight in highlights"
              :key="highlight.label"
              class="flex items-center gap-3 rounded-lg border border-default bg-default px-4 py-3"
            >
              <UIcon
                :name="highlight.icon"
                class="size-5 shrink-0 text-primary"
              />
              <p class="text-sm font-medium text-highlighted">
                {{ highlight.label }}
              </p>
            </div>
          </div>
        </section>

        <section class="hidden min-w-0 rounded-lg border border-default bg-muted/30 shadow-sm lg:block">
          <div class="flex items-start justify-between gap-4 border-b border-default p-5">
            <div>
              <p class="text-sm font-medium text-muted">
                Current budget
              </p>
              <p class="mt-1 text-2xl font-semibold tracking-normal text-highlighted">
                June 2026
              </p>
            </div>
            <div class="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <span class="size-2 rounded-full bg-primary" />
              Active
            </div>
          </div>

          <div class="grid grid-cols-3 divide-x divide-default border-b border-default">
            <div
              v-for="stat in budgetStats"
              :key="stat.label"
              class="p-4"
            >
              <p class="text-xs font-medium uppercase tracking-normal text-muted">
                {{ stat.label }}
              </p>
              <p class="mt-2 text-lg font-semibold tracking-normal text-highlighted">
                {{ stat.value }}
              </p>
            </div>
          </div>

          <div class="grid gap-5 p-5">
            <div>
              <div class="mb-3 flex items-center justify-between gap-3">
                <p class="text-sm font-semibold text-highlighted">
                  Weekly plan
                </p>
                <UIcon
                  name="i-lucide-calendar-range"
                  class="size-5 text-primary"
                />
              </div>
              <div class="space-y-3">
                <div
                  v-for="week in weeklyPlan"
                  :key="week.label"
                  class="grid grid-cols-[72px_minmax(0,1fr)_72px] items-center gap-3"
                >
                  <p class="text-sm font-medium text-highlighted">
                    {{ week.label }}
                  </p>
                  <div class="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      class="h-full rounded-full bg-primary"
                      :style="{ width: week.progress }"
                    />
                  </div>
                  <p class="text-right text-sm font-medium text-muted">
                    {{ week.value }}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div class="mb-3 flex items-center justify-between gap-3">
                <p class="text-sm font-semibold text-highlighted">
                  Categories
                </p>
                <UIcon
                  name="i-lucide-list-tree"
                  class="size-5 text-primary"
                />
              </div>
              <div class="grid gap-2">
                <div
                  v-for="category in budgetCategories"
                  :key="category.name"
                  class="flex items-center justify-between gap-3 rounded-md border border-default bg-default px-3 py-2"
                >
                  <div class="flex min-w-0 items-center gap-3">
                    <div class="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                      <UIcon
                        :name="category.icon"
                        class="size-4 text-muted"
                      />
                    </div>
                    <p class="truncate text-sm font-medium text-highlighted">
                      {{ category.name }}
                    </p>
                  </div>
                  <p class="shrink-0 text-sm font-semibold text-highlighted">
                    {{ category.value }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-lg border border-default bg-default p-6 shadow-sm lg:hidden">
          <div class="mb-6">
            <h2 class="text-2xl font-semibold tracking-normal text-highlighted">
              Sign in
            </h2>
            <p class="mt-2 text-sm text-muted">
              Use your Google account to open your family budget.
            </p>
          </div>

          <UAlert
            v-if="hasOAuthError"
            class="mb-4"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            title="Google sign-in failed"
            description="Try again, or check your Google OAuth configuration."
          />

          <UButton
            :href="googleLoginUrl"
            external
            block
            size="lg"
            color="neutral"
            variant="outline"
            icon="i-simple-icons-google"
            label="Continue with Google"
          />
        </section>
      </main>

      <div class="hidden pb-2 text-xs text-muted lg:block">
        Private household workspace. Google sign-in only.
      </div>
    </section>

    <aside class="hidden min-h-screen flex-col border-l border-default bg-muted/30 px-10 py-6 lg:flex">
      <div class="hidden justify-end lg:flex">
        <UColorModeButton />
      </div>

      <div class="flex flex-1 items-center justify-center">
        <section class="w-full max-w-sm rounded-lg border border-default bg-default p-6 shadow-sm">
          <div class="mb-6">
            <h2 class="text-2xl font-semibold tracking-normal text-highlighted">
              Sign in
            </h2>
            <p class="mt-2 text-sm text-muted">
              Use your Google account to open your family budget.
            </p>
          </div>

          <UAlert
            v-if="hasOAuthError"
            class="mb-4"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            title="Google sign-in failed"
            description="Try again, or check your Google OAuth configuration."
          />

          <UButton
            :href="googleLoginUrl"
            external
            block
            size="lg"
            color="neutral"
            variant="outline"
            icon="i-simple-icons-google"
            label="Continue with Google"
          />
        </section>
      </div>
    </aside>
  </div>
</template>
