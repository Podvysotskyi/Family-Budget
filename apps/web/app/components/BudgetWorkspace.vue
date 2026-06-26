<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

defineOptions({
  name: 'BudgetWorkspace'
})

const props = withDefaults(defineProps<{
  budgetUserId: string
  showUserNavigation?: boolean
  title?: string
}>(), {
  showUserNavigation: true,
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
const budgetPeriodsPath = computed(() => {
  const query = new URLSearchParams({
    month: String(selectedMonth.value),
    year: String(selectedYear.value)
  })

  return `/users/${budgetUserId.value}/budget-period/month?${query.toString()}`
})
const selectedBudgetId = ref<string | null>(null)
const { data: dashboardData } = await useApiFetch<{
  household: {
    householdId: string
    householdName: string
  } | null
  members: Array<{
    userId: string
    name?: string | null
    email: string
  }>
}>('/dashboard')
const { data, error } = await useApiFetch<{
  month: BudgetPeriod
  weeks: BudgetPeriod[]
}>(() => budgetPeriodsPath.value)
type BudgetPeriod = {
  id: string
  type: 'month' | 'week'
  startDate: string
  endDate: string
  isActive: boolean
}
type IncomeType = {
  id: string
  householdId: string
  text: string
}
type Income = {
  id: string
  incomeTypeId: string
  incomeTypeText: string
  amount: number
  date: string
}
type AddIncomePayload = {
  amount: number
  incomeTypeId?: string
  newIncomeTypeText?: string
}

const budgetUserNavigationItems = computed<NavigationMenuItem[]>(() => {
  return (dashboardData.value?.members || []).map(member => ({
    label: member.name || member.email,
    icon: member.userId === budgetUserId.value ? 'i-lucide-circle-dot' : 'i-lucide-circle',
    to: buildBudgetUserPath(member.userId),
    active: member.userId === budgetUserId.value
  }))
})
const householdId = computed(() => dashboardData.value?.household?.householdId || '')
const isIncomeModalOpen = ref(false)
const incomeError = ref('')
const isCreatingIncomeType = ref(false)
const isLoadingIncomeTypes = ref(false)
const incomeTypesLoadError = ref('')
const incomeTypesData = ref<IncomeType[]>([])
const isSavingIncome = ref(false)
const periodLoadError = ref('')
const selectedBudgetRequestKey = ref<string | null>(null)
const selectedBudgetRequestPending = ref(false)
const budgetPeriods = computed(() => {
  if (!data.value) {
    return []
  }

  return [
    data.value.month,
    ...data.value.weeks
  ]
})
const selectedBudget = computed(() => {
  return budgetPeriods.value.find(budget => budget.id === selectedBudgetId.value) || budgetPeriods.value[0] || null
})
const incomeTypes = computed(() => incomeTypesData.value)
const monthlyBudget = computed(() => data.value?.month || null)
const incomePath = computed(() => {
  const budget = selectedBudget.value

  if (!budget) {
    return `/user/${budgetUserId.value}/budget/_/income`
  }

  return `/user/${budgetUserId.value}/budget/${budget.id}/income`
})
const { data: incomeData, refresh: refreshIncomes } = await useApiFetch<{
  incomes: Income[]
}>(() => incomePath.value, {
  immediate: false
})
const incomeEntries = computed(() => incomeData.value?.incomes || [])
const monthlyIncomeTotal = computed(() => {
  return incomeEntries.value.reduce((total, income) => total + income.amount, 0)
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
  const expenses = 0

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

watch(() => selectedBudget.value?.id, async (budgetId) => {
  if (!budgetId) {
    incomeData.value = {
      incomes: []
    }
    return
  }

  await refreshIncomes()
}, { immediate: true })

if (import.meta.client) {
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

function buildBudgetUserPath(userId: string) {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(route.query)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') {
          query.append(key, item)
        }
      }
      continue
    }

    if (typeof value === 'string') {
      query.set(key, value)
    }
  }

  query.set('month', String(selectedMonth.value))
  query.set('year', String(selectedYear.value))

  return `/users/${userId}/budget?${query.toString()}`
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
    const response = await $fetch<{
      income: Income
    }>(`/user/${budgetUserId.value}/budget/${selectedBudget.value.id}/income`, {
      baseURL: '/api',
      method: 'POST',
      credentials: 'include',
      body: {
        incomeTypeId: incomeType.id,
        amount: payload.amount,
        date: incomeDate
      }
    })

    incomeData.value = {
      incomes: [
        ...incomeEntries.value,
        response.income
      ]
    }

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
    const response = await $fetch<{
      incomeType: IncomeType
    }>(`/households/${householdId.value}/income-types`, {
      baseURL: '/api',
      method: 'POST',
      credentials: 'include',
      body: {
        text: trimmedText
      }
    })

    incomeTypesData.value = [...incomeTypesData.value, response.incomeType].sort((left, right) => left.text.localeCompare(right.text))

    return response.incomeType
  } catch {
    incomeError.value = 'Income type could not be created.'
    return null
  } finally {
    isCreatingIncomeType.value = false
  }
}

async function loadIncomeTypes() {
  if (!householdId.value) {
    incomeTypesData.value = []
    return
  }

  isLoadingIncomeTypes.value = true

  try {
    const response = await $fetch<{
      incomeTypes: IncomeType[]
    }>(`/households/${householdId.value}/income-types`, {
      baseURL: '/api',
      credentials: 'include'
    })

    incomeTypesData.value = response.incomeTypes
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
    const query = new URLSearchParams({
      month: String(selectedMonth.value),
      year: String(selectedYear.value)
    })

    if (period.type === 'month') {
      const response = await $fetch<{
        month: BudgetPeriod
        weeks: BudgetPeriod[]
      }>(`/users/${budgetUserId.value}/budget-period/month?${query.toString()}`, {
        baseURL: '/api',
        credentials: 'include'
      })

      data.value = response

      selectedBudgetId.value = response.month.id
      return
    }

    query.set('startDate', period.startDate)
    const response = await $fetch<{
      budget: BudgetPeriod
    }>(`/users/${budgetUserId.value}/budget-period/week?${query.toString()}`, {
      baseURL: '/api',
      credentials: 'include'
    })

    selectedBudgetId.value = response.budget.id
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
</script>

<template>
  <div>
    <UContainer class="py-6">
      <div
        v-if="showUserNavigation && budgetUserNavigationItems.length"
        class="mb-5 overflow-x-auto border-b border-default pb-3"
      >
        <UNavigationMenu
          :items="budgetUserNavigationItems"
          orientation="horizontal"
          :ui="{ link: 'whitespace-nowrap' }"
        />
      </div>

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
