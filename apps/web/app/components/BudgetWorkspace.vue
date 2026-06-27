<script setup lang="ts">
import type { BudgetPeriod, BudgetSubscription, BudgetSubscriptionPayment } from '~/stores/budgets'

defineOptions({
  name: 'BudgetWorkspace'
})

const props = withDefaults(defineProps<{
  budgetUserId: string
  title?: string
}>(), {
  title: 'Budget'
})

const route = useRoute()
const router = useRouter()
const budgetUserId = computed(() => props.budgetUserId)
const selectedMonth = computed(() => parseMonthQuery(route.query.month) || getCurrentBudgetMonth().month)
const selectedYear = computed(() => parseYearQuery(route.query.year) || getCurrentBudgetMonth().year)
const isCurrentMonthSelected = computed(() => {
  const currentMonth = getCurrentBudgetMonth()

  return selectedMonth.value === currentMonth.month && selectedYear.value === currentMonth.year
})
const selectedMonthLabel = computed(() => {
  return new Date(Date.UTC(selectedYear.value, selectedMonth.value - 1, 1)).toLocaleDateString(undefined, {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric'
  })
})
const selectedBudgetId = ref<string | null>(null)
const budgetStore = useBudgetsStore()
const dashboardStore = useDashboardStore()
const incomeTypesStore = useIncomeTypesStore()
await dashboardStore.fetchDashboard()
await budgetStore.fetchMonthBudget(budgetUserId.value, selectedMonth.value, selectedYear.value)
type AddIncomePayload = {
  amount: number
  incomeTypeId?: string
  newIncomeTypeText?: string
}

const householdId = computed(() => dashboardStore.householdId)
const isIncomeModalOpen = ref(false)
const incomeError = ref('')
const isCreatingIncomeType = ref(false)
const isLoadingIncomeTypes = ref(false)
const incomeTypesLoadError = ref('')
const isSavingIncome = ref(false)
const periodLoadError = ref('')
const subscriptionActionError = ref('')
const payingSubscriptionKey = ref<string | null>(null)
const selectedBudgetRequestKey = ref<string | null>(null)
const selectedBudgetRequestPending = ref(false)
const error = computed(() => budgetStore.getMonthBudgetError(budgetUserId.value, selectedMonth.value, selectedYear.value))
const budgetPeriods = computed(() => {
  return budgetStore.getBudgetPeriods(budgetUserId.value, selectedMonth.value, selectedYear.value)
})
const selectedBudget = computed(() => {
  return budgetPeriods.value.find(budget => budget.id === selectedBudgetId.value) || budgetPeriods.value[0] || null
})
const incomeTypes = computed(() => incomeTypesStore.getIncomeTypes(householdId.value))
const monthlyBudget = computed(() => budgetStore.getMonthBudget(budgetUserId.value, selectedMonth.value, selectedYear.value))
const visibleCalendarStartDate = computed(() => {
  const monthStart = new Date(Date.UTC(selectedYear.value, selectedMonth.value - 1, 1))

  return formatDateKey(addDays(monthStart, -getDaysSinceMonday(monthStart)))
})
const visibleCalendarEndDate = computed(() => {
  const monthEnd = new Date(Date.UTC(selectedYear.value, selectedMonth.value, 0))

  return formatDateKey(addDays(monthEnd, 6 - getDaysSinceMonday(monthEnd)))
})
const incomeEntries = computed(() => selectedBudget.value ? budgetStore.getIncomeEntries(selectedBudget.value.id) : [])
const budgetSubscriptions = computed(() => budgetStore.getUserSubscriptions(budgetUserId.value, visibleCalendarStartDate.value, visibleCalendarEndDate.value))
const budgetSubscriptionTransactions = computed(() => budgetStore.getUserSubscriptionTransactions(budgetUserId.value, visibleCalendarStartDate.value, visibleCalendarEndDate.value))
const budgetSubscriptionsError = computed(() => {
  return subscriptionActionError.value
    || budgetStore.getUserSubscriptionsError(budgetUserId.value, visibleCalendarStartDate.value, visibleCalendarEndDate.value)
    || budgetStore.getUserSubscriptionTransactionsError(budgetUserId.value, visibleCalendarStartDate.value, visibleCalendarEndDate.value)
})
const isLoadingBudgetSubscriptions = computed(() => {
  return budgetStore.isUserSubscriptionsLoading(budgetUserId.value, visibleCalendarStartDate.value, visibleCalendarEndDate.value)
    || budgetStore.isUserSubscriptionTransactionsLoading(budgetUserId.value, visibleCalendarStartDate.value, visibleCalendarEndDate.value)
})
const isLoadingSummary = computed(() => {
  return budgetStore.isMonthBudgetLoading(budgetUserId.value, selectedMonth.value, selectedYear.value)
    || (selectedBudget.value ? budgetStore.isIncomeEntriesLoading(selectedBudget.value.id) : true)
    || isLoadingBudgetSubscriptions.value
})
const monthlyIncomeTotal = computed(() => {
  return incomeEntries.value.reduce((total, income) => total + income.amount, 0)
})
const paidSubscriptionTransactionsBySubscriptionId = computed(() => {
  return new Map(budgetSubscriptionTransactions.value.map(transaction => [getSubscriptionTransactionKey(transaction), transaction]))
})
const selectedPeriodSubscriptions = computed(() => {
  if (!selectedBudget.value) {
    return []
  }

  return budgetSubscriptions.value.filter((subscription) => {
    return subscription.occurrenceDate >= selectedBudget.value!.startDate && subscription.occurrenceDate <= selectedBudget.value!.endDate
  })
})
const budgetSubscriptionPayments = computed<BudgetSubscriptionPayment[]>(() => {
  return selectedPeriodSubscriptions.value.map((subscription) => {
    const transaction = paidSubscriptionTransactionsBySubscriptionId.value.get(getSubscriptionKey(subscription))

    return {
      ...subscription,
      isPaid: Boolean(transaction),
      transactionId: transaction?.id || null
    }
  })
})
const subscriptionTotalsByDate = computed(() => {
  return budgetSubscriptions.value.reduce<Record<string, number>>((totals, subscription) => {
    totals[subscription.occurrenceDate] = (totals[subscription.occurrenceDate] || 0) + subscription.amount

    return totals
  }, {})
})
const totalExpenses = computed(() => {
  return budgetSubscriptionPayments.value.reduce((total, subscription) => total + subscription.amount, 0)
})
const summaryTitle = computed(() => {
  return selectedBudget.value?.type === 'week' ? 'Weekly summary' : 'Monthly summary'
})
const summaryDateRange = computed(() => {
  if (selectedBudget.value?.type === 'week') {
    return formatDateRange(selectedBudget.value.startDate, selectedBudget.value.endDate)
  }

  return monthlyBudget.value ? formatDateRange(monthlyBudget.value.startDate, monthlyBudget.value.endDate) : selectedMonthLabel.value
})
const selectedBudgetLabel = computed(() => {
  if (!selectedBudget.value) {
    return selectedMonthLabel.value
  }

  return formatDateRange(selectedBudget.value.startDate, selectedBudget.value.endDate)
})
const monthlySummary = computed(() => {
  const income = monthlyIncomeTotal.value
  const expenses = totalExpenses.value

  return [
    {
      key: 'income',
      label: 'Income',
      value: income
    },
    {
      key: 'expenses',
      label: 'Total Expenses',
      value: expenses
    },
    {
      key: 'balance',
      label: 'Ending Balance',
      value: income - expenses
    }
  ]
})

watch(budgetPeriods, (periods) => {
  if (!periods.length) {
    selectedBudgetId.value = null
    return
  }

  if (!periods.some(period => period.id === selectedBudgetId.value)) {
    const firstPeriod = periods[0]

    if (firstPeriod) {
      selectedBudgetId.value = firstPeriod.id
    }
  }
}, { immediate: true })

watch([budgetUserId, selectedMonth, selectedYear], async ([userId, month, year]) => {
  selectedBudgetId.value = null
  await budgetStore.fetchMonthBudget(userId, month, year)
})

if (import.meta.client) {
  watch(() => selectedBudget.value?.id, async (budgetId) => {
    if (budgetId) {
      subscriptionActionError.value = ''
      await budgetStore.fetchIncomeEntries(budgetUserId.value, budgetId)
    }
  }, { immediate: true })

  watch([budgetUserId, () => monthlyBudget.value?.id, visibleCalendarStartDate, visibleCalendarEndDate], async ([userId, budgetId, fromDate, toDate]) => {
    await budgetStore.fetchUserSubscriptions(userId, fromDate, toDate)

    if (budgetId) {
      await budgetStore.fetchSubscriptionTransactions(userId, budgetId, fromDate, toDate)
    }
  }, { immediate: true })

  watch([selectedMonth, selectedYear], () => {
    const month = String(selectedMonth.value)
    const year = String(selectedYear.value)

    if (route.query.month === month && route.query.year === year) {
      return
    }

    router.replace({
      query: {
        ...route.query,
        month,
        year
      }
    })
  }, { immediate: true })
}

function goToPreviousMonth() {
  setBudgetMonth(selectedYear.value, selectedMonth.value - 1)
}

function goToNextMonth() {
  setBudgetMonth(selectedYear.value, selectedMonth.value + 1)
}

function goToCurrentMonth() {
  const currentMonth = getCurrentBudgetMonth()

  setBudgetMonth(currentMonth.year, currentMonth.month)
}

function setBudgetMonth(year: number, month: number) {
  const date = new Date(Date.UTC(year, month - 1, 1))
  selectedBudgetId.value = null

  router.push({
    query: {
      ...route.query,
      month: String(date.getUTCMonth() + 1),
      year: String(date.getUTCFullYear())
    }
  })
}

function getBudgetLabel(budget: BudgetPeriod) {
  if (budget.type === 'month') {
    return 'Month'
  }

  return formatDateRange(budget.startDate, budget.endDate)
}

function formatDateRange(startDate: string, endDate: string) {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString(undefined, {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric'
  })
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date)

  nextDate.setUTCDate(nextDate.getUTCDate() + days)

  return nextDate
}

function getDaysSinceMonday(date: Date) {
  return (date.getUTCDay() + 6) % 7
}

function getCurrentBudgetMonth() {
  const now = new Date()

  return {
    month: now.getMonth() + 1,
    year: now.getFullYear()
  }
}

function parseMonthQuery(value: unknown) {
  const month = parseQueryNumber(value)

  if (!month || month < 1 || month > 12) {
    return null
  }

  return month
}

function parseYearQuery(value: unknown) {
  const year = parseQueryNumber(value)

  if (!year || year < 1900 || year > 3000) {
    return null
  }

  return year
}

function parseQueryNumber(value: unknown) {
  const queryValue = Array.isArray(value) ? value[0] : value

  if (typeof queryValue !== 'string') {
    return null
  }

  const number = Number(queryValue)

  return Number.isInteger(number) ? number : null
}

async function openIncomeModal() {
  incomeError.value = ''
  incomeTypesLoadError.value = ''
  await loadIncomeTypes()
  isIncomeModalOpen.value = true
}

function closeIncomeModal() {
  isIncomeModalOpen.value = false
  incomeError.value = ''
}

function setIncomeModalOpen(open: boolean) {
  if (open) {
    openIncomeModal()
    return
  }

  closeIncomeModal()
}

async function saveIncome(payload: AddIncomePayload) {
  const incomeDate = selectedBudget.value?.startDate
  const incomeType = payload.newIncomeTypeText
    ? await createIncomeType(payload.newIncomeTypeText)
    : incomeTypes.value.find(item => item.id === payload.incomeTypeId) || null

  if (!incomeDate) {
    incomeError.value = 'Income date is required.'
    return
  }

  if (!incomeType) {
    incomeError.value = payload.newIncomeTypeText ? 'Income type could not be created.' : 'Income type is required.'
    return
  }

  incomeError.value = ''
  isSavingIncome.value = true

  try {
    await budgetStore.createIncome(budgetUserId.value, selectedBudget.value.id, {
      incomeTypeId: incomeType.id,
      amount: payload.amount,
      date: incomeDate
    })

    closeIncomeModal()
  } catch {
    incomeError.value = 'Income could not be created.'
  } finally {
    isSavingIncome.value = false
  }
}

async function createIncomeType(text: string) {
  const trimmedText = text.trim()

  if (!householdId.value || !trimmedText || isCreatingIncomeType.value) {
    return null
  }

  incomeError.value = ''
  isCreatingIncomeType.value = true

  try {
    return await incomeTypesStore.createIncomeType(householdId.value, trimmedText)
  } catch {
    incomeError.value = 'Income type could not be created.'
    return null
  } finally {
    isCreatingIncomeType.value = false
  }
}

async function loadIncomeTypes() {
  if (!householdId.value) {
    return
  }

  isLoadingIncomeTypes.value = true

  try {
    await incomeTypesStore.fetchIncomeTypes(householdId.value)
  } catch {
    incomeTypesLoadError.value = 'Income types could not be loaded.'
  } finally {
    isLoadingIncomeTypes.value = false
  }
}

async function selectBudgetPeriod(period: BudgetPeriod) {
  periodLoadError.value = ''
  selectedBudgetRequestPending.value = true
  selectedBudgetRequestKey.value = getBudgetKey(period)

  try {
    if (period.type === 'month') {
      await budgetStore.fetchMonthBudget(budgetUserId.value, selectedMonth.value, selectedYear.value, { force: true })
      selectedBudgetId.value = monthlyBudget.value?.id || null
      return
    }

    selectedBudgetId.value = period.id
  } catch {
    periodLoadError.value = 'Budget period could not be loaded.'
  } finally {
    selectedBudgetRequestPending.value = false
    selectedBudgetRequestKey.value = null
  }
}

function getBudgetKey(period: Pick<BudgetPeriod, 'type' | 'startDate'>) {
  return `${period.type}:${period.startDate}`
}

async function markSubscriptionPaid(subscription: BudgetSubscriptionPayment) {
  if (!selectedBudget.value || subscription.isPaid) {
    return
  }

  subscriptionActionError.value = ''
  payingSubscriptionKey.value = getSubscriptionKey(subscription)

  try {
    await budgetStore.markSubscriptionPaid(budgetUserId.value, selectedBudget.value.id, subscription)
  } catch {
    subscriptionActionError.value = 'Subscription could not be marked paid.'
  } finally {
    payingSubscriptionKey.value = null
  }
}

async function markSubscriptionUnpaid(subscription: BudgetSubscriptionPayment) {
  if (!selectedBudget.value || !subscription.isPaid) {
    return
  }

  subscriptionActionError.value = ''
  payingSubscriptionKey.value = getSubscriptionKey(subscription)

  try {
    await budgetStore.markSubscriptionUnpaid(budgetUserId.value, selectedBudget.value.id, subscription)
  } catch {
    subscriptionActionError.value = 'Subscription could not be marked unpaid.'
  } finally {
    payingSubscriptionKey.value = null
  }
}

function getSubscriptionKey(subscription: Pick<BudgetSubscription, 'id' | 'occurrenceDate'>) {
  return `${subscription.id}:${subscription.occurrenceDate}`
}

function getSubscriptionTransactionKey(transaction: { subscriptionId: string, date: string }) {
  return `${transaction.subscriptionId}:${transaction.date}`
}
</script>

<template>
  <div>
    <UContainer class="py-6">
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <h1 class="truncate text-2xl font-semibold tracking-normal text-highlighted">
            {{ title }}
          </h1>
        </div>

        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-chevron-left"
            color="neutral"
            variant="outline"
            aria-label="Previous month"
            @click="goToPreviousMonth"
          />
          <div class="min-w-40 text-center text-sm font-semibold text-highlighted">
            {{ selectedMonthLabel }}
          </div>
          <UButton
            icon="i-lucide-chevron-right"
            color="neutral"
            variant="outline"
            aria-label="Next month"
            @click="goToNextMonth"
          />
          <UButton
            color="neutral"
            variant="ghost"
            label="Today"
            :disabled="isCurrentMonthSelected"
            @click="goToCurrentMonth"
          />
        </div>
      </div>

      <UAlert
        v-if="error"
        class="mb-6"
        color="error"
        variant="subtle"
        icon="i-lucide-database"
        title="Budget page is unavailable"
        description="Check that this user belongs to your household."
      />

      <MonthlySummaryPanel
        :title="summaryTitle"
        :date-range="summaryDateRange"
        :is-loading="isLoadingSummary"
        :items="monthlySummary"
      />

      <section class="rounded-lg border border-default bg-default">
        <div class="border-b border-default px-5 py-4">
          <h2 class="text-base font-semibold text-highlighted">
            Budget period
          </h2>
        </div>

        <div class="space-y-5 p-5">
          <UAlert
            v-if="periodLoadError"
            color="error"
            variant="subtle"
            icon="i-lucide-database"
            title="Budget period is unavailable"
            :description="periodLoadError"
          />

          <div
            v-if="budgetPeriods.length"
            class="flex flex-wrap gap-2"
          >
            <UButton
              v-for="period in budgetPeriods"
              :key="period.id"
              color="neutral"
              :variant="period.id === selectedBudget?.id ? 'solid' : 'outline'"
              :label="getBudgetLabel(period)"
              :loading="selectedBudgetRequestPending && selectedBudgetRequestKey === getBudgetKey(period)"
              :disabled="selectedBudgetRequestPending"
              @click="selectBudgetPeriod(period)"
            />
          </div>

          <div
            v-if="selectedBudget"
            class="rounded-lg border border-default p-5"
          >
            <BudgetCalendar
              :period="selectedBudget"
              :month="selectedMonth"
              :subscription-totals-by-date="subscriptionTotalsByDate"
              :year="selectedYear"
            />
          </div>

          <div
            v-else
            class="text-sm text-muted"
          >
            No budget periods found.
          </div>
        </div>
      </section>

      <BudgetCategoriesPanel
        v-if="householdId"
        :household-id="householdId"
        :subscriptions="budgetSubscriptionPayments"
        :subscriptions-error="budgetSubscriptionsError"
        :is-loading-subscriptions="isLoadingBudgetSubscriptions"
        :paying-subscription-key="payingSubscriptionKey"
        @mark-subscription-paid="markSubscriptionPaid"
        @mark-subscription-unpaid="markSubscriptionUnpaid"
      />
    </UContainer>

    <AddIncomeModal
      :open="isIncomeModalOpen"
      :period-label="selectedBudgetLabel"
      :income-types="incomeTypes"
      :existing-incomes="incomeEntries"
      :income-total="monthlyIncomeTotal"
      :error="incomeTypesLoadError || incomeError"
      :is-loading-income-types="isLoadingIncomeTypes"
      :is-submitting="isCreatingIncomeType || isSavingIncome"
      @update:open="setIncomeModalOpen"
      @submit="saveIncome"
    />
  </div>
</template>
