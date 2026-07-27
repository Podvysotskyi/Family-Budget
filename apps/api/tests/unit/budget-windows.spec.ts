import { describe, expect, it } from 'vitest'
import {
  buildBudgetInputsAroundCurrentMonth,
  getCurrentMonthRange,
  getWeeksIntersectingMonth
} from '../../src/modules/budgets/budget-windows'
import { BudgetType } from '../../src/modules/budgets/entities/budget-type'

describe('budget windows', () => {
  it('uses the scheduling timezone when selecting the current month', () => {
    const instant = new Date('2026-03-01T05:30:00.000Z')

    expect(getCurrentMonthRange(instant, 'America/Chicago')).toEqual({
      startDate: '2026-02-01',
      endDate: '2026-02-28'
    })
    expect(getCurrentMonthRange(instant, 'UTC')).toEqual({
      startDate: '2026-03-01',
      endDate: '2026-03-31'
    })
  })

  it('returns complete Monday-to-Sunday weeks intersecting a month', () => {
    expect(getWeeksIntersectingMonth({
      startDate: '2026-02-01',
      endDate: '2026-02-28'
    })).toEqual([
      { startDate: '2026-01-26', endDate: '2026-02-01' },
      { startDate: '2026-02-02', endDate: '2026-02-08' },
      { startDate: '2026-02-09', endDate: '2026-02-15' },
      { startDate: '2026-02-16', endDate: '2026-02-22' },
      { startDate: '2026-02-23', endDate: '2026-03-01' }
    ])
  })

  it('deduplicates overlapping weekly budgets across adjacent months', () => {
    const inputs = buildBudgetInputsAroundCurrentMonth(
      ['household-1'],
      new Date('2026-02-15T12:00:00.000Z'),
      'America/Chicago',
      1,
      1
    )
    const keys = inputs.map(input => `${input.type}:${input.startDate}`)

    expect(new Set(keys).size).toBe(keys.length)
    expect(inputs.filter(input => input.type === BudgetType.Month)).toHaveLength(3)
  })
})
