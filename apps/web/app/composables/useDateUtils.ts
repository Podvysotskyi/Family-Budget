export function useDateUtils() {
  function getToday() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return today
  }

  function getTodayDate() {
    return formatDateForApi(getToday())
  }

  function formatDateForApi(value: Date) {
    const date = value
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  function parseApiDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null
    }

    const [year, month, day] = value.split('-').map(Number)

    if (!year || !month || !day) {
      return null
    }

    return new Date(year, month - 1, day)
  }

  return {
    formatDateForApi,
    getToday,
    getTodayDate,
    parseApiDate
  }
}
