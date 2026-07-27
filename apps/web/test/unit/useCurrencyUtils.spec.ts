import { describe, expect, it } from 'vitest'
import { useCurrencyUtils } from '../../app/composables/useCurrencyUtils'

describe('useCurrencyUtils', () => {
  it('formats numeric USD values', () => {
    const { formatCurrency } = useCurrencyUtils()

    expect(formatCurrency(1234.5, 'Missing')).toMatch(/\$1,234\.50/)
    expect(formatCurrency(0, 'Missing')).toMatch(/\$0\.00/)
  })

  it('uses the provided fallback for null values', () => {
    const { formatCurrency } = useCurrencyUtils()

    expect(formatCurrency(null, 'No amount')).toBe('No amount')
  })
})
