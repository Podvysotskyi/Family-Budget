<script setup lang="ts">
import type { BudgetSubscriptionPayment } from '~/stores/budgets'
import type { BudgetCategory } from '~/stores/budget-categories'

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
const isLoadingBudgetCategories = computed(() => budgetCategoriesStore.isLoading(props.householdId))
const budgetCategories = computed(() => budgetCategoriesStore.getCategories(props.householdId))
const leftBudgetCategories = computed(() => budgetCategories.value.filter((_, index) => index % 2 === 0))
const rightBudgetCategories = computed(() => budgetCategories.value.filter((_, index) => index % 2 === 1))

function getCategoryComponent(category: BudgetCategory) {
  switch (category.type) {
    case 'subscriptions':
      return resolveComponent('BudgetCategorySubscriptionsCard')
    case 'bills':
      return resolveComponent('BudgetCategoryBillsCard')
    case 'credit_cards':
      return resolveComponent('BudgetCategoryCreditCardsCard')
    case 'goals':
      return resolveComponent('BudgetCategoryGoalsCard')
    case 'other':
      return resolveComponent('BudgetCategoryOtherCard')
    default:
      return resolveComponent('BudgetCategoryCustomCard')
  }
}

function markSubscriptionPaid(subscription: BudgetSubscriptionPayment) {
  emit('markSubscriptionPaid', subscription)
}

function markSubscriptionUnpaid(subscription: BudgetSubscriptionPayment) {
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
        v-else-if="isLoadingBudgetCategories && !budgetCategories.length"
        class="grid gap-4 md:grid-cols-2"
      >
        <div
          v-for="index in 4"
          :key="index"
        >
          <UCard :ui="{ header: 'p-5 sm:px-5', body: 'p-4 sm:p-4' }">
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <USkeleton class="h-5 w-36" />
                <USkeleton class="h-5 w-20" />
              </div>
            </template>

            <div class="space-y-3">
              <USkeleton class="h-4 w-32" />
              <USkeleton class="h-4 w-44" />
            </div>
          </UCard>
        </div>
      </div>

      <div
        v-else-if="budgetCategories.length"
        class="space-y-0"
      >
        <div class="md:hidden">
          <component
            :is="getCategoryComponent(category)"
            v-for="category in budgetCategories"
            :key="category.id"
            :category="category"
            :subscriptions="subscriptions"
            :subscriptions-error="subscriptionsError"
            :is-loading-subscriptions="isLoadingSubscriptions"
            :paying-subscription-key="payingSubscriptionKey"
            @mark-subscription-paid="markSubscriptionPaid"
            @mark-subscription-unpaid="markSubscriptionUnpaid"
          />
        </div>

        <div class="hidden gap-4 md:grid md:grid-cols-2">
          <div>
            <component
              :is="getCategoryComponent(category)"
              v-for="category in leftBudgetCategories"
              :key="category.id"
              :category="category"
              :subscriptions="subscriptions"
              :subscriptions-error="subscriptionsError"
              :is-loading-subscriptions="isLoadingSubscriptions"
              :paying-subscription-key="payingSubscriptionKey"
              @mark-subscription-paid="markSubscriptionPaid"
              @mark-subscription-unpaid="markSubscriptionUnpaid"
            />
          </div>

          <div>
            <component
              :is="getCategoryComponent(category)"
              v-for="category in rightBudgetCategories"
              :key="category.id"
              :category="category"
              :subscriptions="subscriptions"
              :subscriptions-error="subscriptionsError"
              :is-loading-subscriptions="isLoadingSubscriptions"
              :paying-subscription-key="payingSubscriptionKey"
              @mark-subscription-paid="markSubscriptionPaid"
              @mark-subscription-unpaid="markSubscriptionUnpaid"
            />
          </div>
        </div>
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
