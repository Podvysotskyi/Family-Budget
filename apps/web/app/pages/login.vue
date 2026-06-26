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
</script>

<template>
  <div class="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_420px]">
    <section class="hidden border-r border-default bg-default lg:flex lg:flex-col lg:justify-between">
      <div class="p-8">
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
      </div>

      <div class="max-w-2xl p-8">
        <p class="text-4xl font-semibold tracking-normal text-highlighted">
          Keep household spending organized from one shared place.
        </p>
        <div class="mt-8 grid grid-cols-3 gap-4">
          <div class="rounded-lg border border-default bg-muted/40 p-4">
            <UIcon
              name="i-lucide-users"
              class="mb-4 size-5 text-primary"
            />
            <p class="text-sm font-medium text-highlighted">
              Members
            </p>
            <p class="mt-1 text-sm text-muted">
              Shared household access.
            </p>
          </div>
          <div class="rounded-lg border border-default bg-muted/40 p-4">
            <UIcon
              name="i-lucide-banknote"
              class="mb-4 size-5 text-info"
            />
            <p class="text-sm font-medium text-highlighted">
              Budgets
            </p>
            <p class="mt-1 text-sm text-muted">
              Monthly planning foundation.
            </p>
          </div>
          <div class="rounded-lg border border-default bg-muted/40 p-4">
            <UIcon
              name="i-lucide-shield-check"
              class="mb-4 size-5 text-success"
            />
            <p class="text-sm font-medium text-highlighted">
              Private
            </p>
            <p class="mt-1 text-sm text-muted">
              Google sign-in only.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="flex min-h-screen items-center justify-center px-6 py-10">
      <div class="w-full max-w-sm">
        <div class="mb-8 lg:hidden">
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
        </div>

        <div class="rounded-lg border border-default bg-default p-6 shadow-sm">
          <div class="mb-6">
            <h1 class="text-2xl font-semibold tracking-normal text-highlighted">
              Sign in
            </h1>
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
        </div>
      </div>
    </section>
  </div>
</template>
