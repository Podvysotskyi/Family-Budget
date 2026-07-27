import { describe, expect, it } from 'vitest'
import { useDateUtils } from '../../app/composables/useDateUtils'

describe('useDateUtils', () => {
  const { formatDateToString, parseDateString } = useDateUtils()

  it('formats a local calendar date without shifting timezones', () => {
    expect(formatDateToString(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('parses an ISO calendar date into local date parts', () => {
    const date = parseDateString('2026-07-26')

    expect(date?.getFullYear()).toBe(2026)
    expect(date?.getMonth()).toBe(6)
    expect(date?.getDate()).toBe(26)
  })

  it('rejects values that are not ISO calendar dates', () => {
    expect(parseDateString('07/26/2026')).toBeNull()
    expect(parseDateString('')).toBeNull()
  })
})
