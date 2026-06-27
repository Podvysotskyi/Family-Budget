<script setup lang="ts">
import type { BudgetSubscriptionPayment } from '~/stores/budgets'

defineOptions({
  name: 'BudgetCategoriesPanel'
})

const props = defineProps<{
  householdId: string
  isLoadingSubscriptions?: boolean
  payingSubscriptionKey?: string | null
  subscriptions?: BudgetSubscriptionPayment[]
  subscriptionsError?: string | null
}>()
const emit = defineEmits<{
  markSubscriptionPaid: [subscription: BudgetSubscriptionPayment]
  markSubscriptionUnpaid: [subscription: BudgetSubscriptionPayment]
}>()

const budgetCategoriesStore = useBudgetCategoriesStore()
await budgetCategoriesStore.fetchCategories(props.householdId)

const error = computed(() => budgetCategoriesStore.getError(props.householdId))
const budgetCategories = computed(() => budgetCategoriesStore.getCategories(props.householdId))
const subscriptions = computed(() => props.subscriptions || [])
const subscriptionsPaidTotal = computed(() => subscriptions.value.reduce((total, subscription) => {
  return subscription.isPaid ? total + subscription.amount : total
}, 0))
const subscriptionsTotal = computed(() => subscriptions.value.reduce((total, subscription) => total + subscription.amount, 0))
const hasSubscriptionPayments = computed(() => subscriptionsPaidTotal.value > 0)
const areSubscriptionsFullyPaid = computed(() => subscriptionsTotal.value > 0 && subscriptionsPaidTotal.value >= subscriptionsTotal.value)

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value)
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString(undefined, {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric'
  })
}

function getSubscriptionKey(subscription: BudgetSubscriptionPayment) {
  return `${subscription.id}:${subscription.occurrenceDate}`
}

function setSubscriptionPaid(subscription: BudgetSubscriptionPayment, value: boolean) {
  if (value === subscription.isPaid) {
    return
  }

  if (value) {
    emit('markSubscriptionPaid', subscription)
    return
  }

  emit('markSubscriptionUnpaid', subscription)
}
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
        <UCard
          v-for="category in budgetCategories"
          :key="category.id"
          :ui="{ header: 'p-5 sm:px-5', body: 'p-0 sm:p-0' }"
        >
          <template #header>
            <div class="flex items-start justify-between gap-3">
              <h3 class="truncate text-sm font-semibold text-highlighted">
                {{ category.name }}
              </h3>
              <div
                v-if="category.type === 'subscriptions'"
                class="flex shrink-0 items-center gap-1 text-sm font-semibold"
              >
                <span
                  v-if="areSubscriptionsFullyPaid"
                  class="text-success"
                >
                  {{ formatCurrency(subscriptionsPaidTotal) }}
                </span>
                <template v-else-if="hasSubscriptionPayments">
                  <span class="text-success">
                    {{ formatCurrency(subscriptionsPaidTotal) }}
                  </span>
                  <span class="text-muted">/</span>
                  <span class="text-error">
                    {{ formatCurrency(subscriptionsTotal) }}
                  </span>
                </template>
                <span
                  v-else
                  class="text-error"
                >
                  {{ formatCurrency(subscriptionsTotal) }}
                </span>
              </div>
            </div>
          </template>

          <div v-if="category.type === 'subscriptions'">
            <div
              v-if="isLoadingSubscriptions && !subscriptions.length"
              class="space-y-2"
            >
              <USkeleton class="h-10 w-full" />
              <USkeleton class="h-10 w-full" />
            </div>

            <UAlert
              v-else-if="subscriptionsError"
              color="error"
              variant="subtle"
              icon="i-lucide-database"
              title="Subscriptions are unavailable"
              :description="subscriptionsError"
            />

            <div
              v-else-if="subscriptions.length"
              class="divide-y divide-default"
            >
              <div
                v-for="subscription in subscriptions"
                :key="getSubscriptionKey(subscription)"
                class="flex items-center justify-between gap-3 px-3 py-2"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-highlighted">
                    {{ subscription.name }}
                  </p>
                  <p class="mt-0.5 text-xs text-muted">
                    {{ formatDate(subscription.occurrenceDate) }}
                  </p>
                </div>
                <div class="flex shrink-0 items-center gap-2">
                  <p class="text-sm font-semibold text-highlighted">
                    {{ formatCurrency(subscription.amount) }}
                  </p>
                  <USwitch
                    :model-value="subscription.isPaid"
                    :disabled="payingSubscriptionKey === getSubscriptionKey(subscription)"
                    :aria-label="subscription.isPaid ? 'Mark as unpaid' : 'Mark as paid'"
                    @update:model-value="value => setSubscriptionPaid(subscription, value)"
                  />
                </div>
              </div>
            </div>

            <div v-else class="px-4 py-2">
              <p class="text-sm text-muted ma-4">
                No subscriptions for this period.
              </p>
            </div>
          </div>

          <div v-else class="px-4 py-2">
            <p class="text-sm text-muted">
              No budget items yet.
            </p>
          </div>
        </UCard>
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
