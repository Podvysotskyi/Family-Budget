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
  monthLabel: string
  isOutsideMonth: boolean
  isSelectedPeriod: boolean
  isToday: boolean
}

const props = defineProps<{
  period: BudgetPeriod
  month: number
  year: number
}>()

const weekDayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const calendarDays = computed(() => {
  if (props.period.type === 'week') {
    return buildPeriodCalendarDays(props.period)
  }

  return buildMonthCalendarDays(props.year, props.month, props.period)
})

function getCalendarDayClass(day: CalendarDay) {
  return [
    'min-h-14 rounded-md border p-2 text-left transition-colors sm:min-h-20',
    day.isSelectedPeriod ? 'border-primary/40 bg-primary/10' : 'border-default bg-default',
    day.isOutsideMonth ? 'text-dimmed' : 'text-highlighted',
    day.isToday ? 'ring-2 ring-primary/50' : ''
  ]
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

function buildPeriodCalendarDays(selectedPeriod: BudgetPeriod) {
  const periodStart = parseBudgetDate(selectedPeriod.startDate)
  const periodEnd = parseBudgetDate(selectedPeriod.endDate)
  const days: CalendarDay[] = []

  for (let date = periodStart; date <= periodEnd; date = addDays(date, 1)) {
    days.push(buildCalendarDay(date, selectedPeriod))
  }

  return days
}

function buildCalendarDay(date: Date, selectedPeriod: BudgetPeriod, selectedMonthNumber?: number): CalendarDay {
  const key = formatDateKey(date)

  return {
    key,
    dayOfMonth: date.getUTCDate(),
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

function parseBudgetDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`)
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
  <div class="grid grid-cols-7 gap-1 text-center text-xs font-medium uppercase text-muted">
    <span
      v-for="dayLabel in weekDayLabels"
      :key="dayLabel"
    >
      {{ dayLabel }}
    </span>
  </div>

  <div class="mt-2 grid grid-cols-7 gap-1">
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
    </div>
  </div>
</template>
