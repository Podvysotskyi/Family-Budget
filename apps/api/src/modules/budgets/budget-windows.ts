import type { EnsureBudgetDto } from './dto/ensure-budget.dto'
import { BudgetType } from './entities/budget-type'

export interface DateRange {
  startDate: string
  endDate: string
}

export function buildCurrentMonthBudgetInputs(householdIds: string[], now = new Date(), timeZone = 'America/Chicago') {
  const monthRange = getCurrentMonthRange(now, timeZone)

  return buildBudgetInputsForMonthRanges(householdIds, [monthRange])
}

export function buildBudgetInputsForMonth(householdIds: string[], year: number, month: number) {
  return buildBudgetInputsForMonthRanges(householdIds, [getMonthRange(year, month)])
}

export function buildBudgetInputsAroundCurrentMonth(
  householdIds: string[],
  now = new Date(),
  timeZone = 'America/Chicago',
  monthsBefore = 12,
  monthsAfter = 12
) {
  const currentDate = getDatePartsInTimeZone(now, timeZone)
  const monthRanges: DateRange[] = []

  for (let monthOffset = -monthsBefore; monthOffset <= monthsAfter; monthOffset += 1) {
    monthRanges.push(getMonthRange(currentDate.year, currentDate.month, monthOffset))
  }

  return buildBudgetInputsForMonthRanges(householdIds, monthRanges)
}

function buildBudgetInputsForMonthRanges(householdIds: string[], monthRanges: DateRange[]) {
  const budgets = householdIds.flatMap<EnsureBudgetDto>(householdId => monthRanges.flatMap((monthRange) => {
    const weeklyRanges = getWeeksIntersectingMonth(monthRange)

    return [
      {
        householdId,
        type: BudgetType.Month,
        startDate: monthRange.startDate,
        endDate: monthRange.endDate
      },
      ...weeklyRanges.map(weekRange => ({
        householdId,
        type: BudgetType.Week,
        startDate: weekRange.startDate,
        endDate: weekRange.endDate
      }))
    ]
  }))
  const uniqueBudgets = new Map<string, EnsureBudgetDto>()

  for (const budget of budgets) {
    uniqueBudgets.set(getBudgetKey(budget), budget)
  }

  return [...uniqueBudgets.values()]
}

export function getCurrentMonthRange(now = new Date(), timeZone = 'America/Chicago'): DateRange {
  const currentDate = getDatePartsInTimeZone(now, timeZone)

  return getMonthRange(currentDate.year, currentDate.month)
}

export function getWeeksIntersectingMonth(monthRange: DateRange): DateRange[] {
  const monthStart = parseDate(monthRange.startDate)
  const monthEnd = parseDate(monthRange.endDate)
  const firstWeekStart = addDays(monthStart, -getDaysSinceMonday(monthStart))
  const weeks: DateRange[] = []

  for (let weekStart = firstWeekStart; weekStart <= monthEnd; weekStart = addDays(weekStart, 7)) {
    weeks.push({
      startDate: formatDate(weekStart),
      endDate: formatDate(addDays(weekStart, 6))
    })
  }

  return weeks
}

function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)

  return {
    year: Number(getDatePart(parts, 'year')),
    month: Number(getDatePart(parts, 'month')),
    day: Number(getDatePart(parts, 'day'))
  }
}

function getDatePart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  const part = parts.find(item => item.type === type)

  if (!part) {
    throw new Error(`Could not determine ${type} for scheduling date`)
  }

  return part.value
}

function getDaysSinceMonday(date: Date) {
  return (date.getUTCDay() + 6) % 7
}

function getMonthRange(year: number, month: number, monthOffset = 0): DateRange {
  const monthStart = new Date(Date.UTC(year, month - 1 + monthOffset, 1))
  const monthEnd = new Date(Date.UTC(year, month + monthOffset, 0))

  return {
    startDate: formatDate(monthStart),
    endDate: formatDate(monthEnd)
  }
}

function getBudgetKey(input: Pick<EnsureBudgetDto, 'householdId' | 'type' | 'startDate'>) {
  return `${input.householdId}:${input.type}:${input.startDate}`
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`)
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date)

  nextDate.setUTCDate(nextDate.getUTCDate() + days)

  return nextDate
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10)
}
