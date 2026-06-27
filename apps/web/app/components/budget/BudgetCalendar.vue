<script lang="ts" setup>
defineOptions({
  name: 'BudgetCalendar'
})

type BudgetPeriod = {
  id: string
  type: 'month' | 'week'
  startDate: string
  endDate: string
  isActive: boolean
}

type CalendarDay = {
  key: string
  dayOfMonth: number
  listLabel: string
  monthLabel: string
  isOutsideMonth: boolean
  isSelectedPeriod: boolean
  isToday: boolean
}

const props = defineProps<{
  period: BudgetPeriod
  month: number
  subscriptionTotalsByDate?: Record<string, number>
  year: number
}>()

const weekDayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const calendarDays = computed(() => {
  return buildMonthCalendarDays(props.year, props.month, props.period)
})
const selectedPeriodDays = computed(() => {
  return calendarDays.value.filter(day => day.isSelectedPeriod)
})

function getCalendarDayClass(day: CalendarDay) {
  return [
    'flex min-h-14 flex-col rounded-md border p-2 text-left transition-colors sm:min-h-20',
    day.isSelectedPeriod ? 'border-primary/40 bg-primary/10' : 'border-default bg-default',
    day.isOutsideMonth ? 'text-dimmed' : 'text-highlighted',
    day.isToday ? 'ring-2 ring-primary/50' : ''
  ]
}

function getSubscriptionTotal(dayKey: string) {
  return props.subscriptionTotalsByDate?.[dayKey] || 0
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value)
}

function buildMonthCalendarDays(year: number, month: number, selectedPeriod: BudgetPeriod) {
  const monthStart = new Date(Date.UTC(year, month - 1, 1))
  const monthEnd = new Date(Date.UTC(year, month, 0))
  const calendarStart = addDays(monthStart, -getDaysSinceMonday(monthStart))
  const calendarEnd = addDays(monthEnd, 6 - getDaysSinceMonday(monthEnd))
  const days: CalendarDay[] = []

  for (let date = calendarStart; date <= calendarEnd; date = addDays(date, 1)) {
    days.push(buildCalendarDay(date, selectedPeriod, month))
  }

  return days
}

function buildCalendarDay(date: Date, selectedPeriod: BudgetPeriod, selectedMonthNumber?: number): CalendarDay {
  const key = formatDateKey(date)

  return {
    key,
    dayOfMonth: date.getUTCDate(),
    listLabel: date.toLocaleDateString(undefined, {
      timeZone: 'UTC',
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }),
    monthLabel: date.toLocaleDateString(undefined, {
      timeZone: 'UTC',
      month: 'short'
    }),
    isOutsideMonth: selectedMonthNumber !== undefined && date.getUTCMonth() + 1 !== selectedMonthNumber,
    isSelectedPeriod: key >= selectedPeriod.startDate && key <= selectedPeriod.endDate,
    isToday: key === formatDateKey(new Date())
  }
}

function getDaysSinceMonday(date: Date) {
  return (date.getUTCDay() + 6) % 7
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date)

  nextDate.setUTCDate(nextDate.getUTCDate() + days)

  return nextDate
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}
</script>

<template>
  <div class="space-y-2 sm:hidden">
    <div
      v-for="day in selectedPeriodDays"
      :key="day.key"
      class="flex min-h-12 items-center justify-between gap-3 rounded-md border border-primary/40 bg-primary/10 px-3 py-2"
    >
      <div class="flex min-w-0 items-center gap-2">
        <span class="truncate text-sm font-semibold text-highlighted">
          {{ day.listLabel }}
        </span>
        <span
          v-if="day.isToday"
          aria-label="Today"
          class="size-1.5 shrink-0 rounded-full bg-primary"
        />
      </div>
      <p
        v-if="getSubscriptionTotal(day.key) > 0"
        class="shrink-0 text-sm font-semibold text-error"
      >
        {{ formatCurrency(getSubscriptionTotal(day.key)) }}
      </p>
    </div>
  </div>

  <div class="hidden grid-cols-7 gap-1 text-center text-xs font-medium uppercase text-muted sm:grid">
    <span
      v-for="dayLabel in weekDayLabels"
      :key="dayLabel"
    >
      {{ dayLabel }}
    </span>
  </div>

  <div class="mt-2 hidden grid-cols-7 gap-1 sm:grid">
    <div
      v-for="day in calendarDays"
      :key="day.key"
      :class="getCalendarDayClass(day)"
    >
      <div class="flex items-start justify-between gap-1">
        <span class="min-w-0 truncate text-sm font-semibold leading-none">
          {{ day.monthLabel }} {{ day.dayOfMonth }}
        </span>
        <span
          v-if="day.isToday"
          aria-label="Today"
          class="size-1.5 rounded-full bg-primary"
        />
      </div>
      <p
        v-if="getSubscriptionTotal(day.key) > 0"
        class="mt-2 text-xs font-semibold text-error"
      >
        {{ formatCurrency(getSubscriptionTotal(day.key)) }}
      </p>
    </div>
  </div>
</template>
