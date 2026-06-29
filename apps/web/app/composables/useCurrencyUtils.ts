export function useCurrencyUtils() {
  function formatCurrency(value: number | null, fallback: string) {
    return value === null ? fallback : new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD'
    }).format(value)
  }

  return {
    formatCurrency
  }
}
