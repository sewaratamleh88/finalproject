export type HistoryFilter = 'all' | 'month' | '3months'

export function getHistoryCutoff(filter: HistoryFilter): Date | null {
  if (filter === 'all') return null
  const cutoff = new Date()
  if (filter === 'month') {
    cutoff.setMonth(cutoff.getMonth() - 1)
  } else {
    cutoff.setMonth(cutoff.getMonth() - 3)
  }
  cutoff.setHours(0, 0, 0, 0)
  return cutoff
}

function isOnOrAfterCutoff(itemDate: Date, cutoff: Date | null): boolean {
  if (!cutoff) return true
  const day = new Date(itemDate)
  if (Number.isNaN(day.getTime())) return true
  day.setHours(0, 0, 0, 0)
  return day >= cutoff
}

export function matchesHistoryFilter(
  dateInput: string | undefined,
  filter: HistoryFilter,
): boolean {
  const cutoff = getHistoryCutoff(filter)
  if (!cutoff) return true
  if (!dateInput) return true
  const parsed = dateInput.includes('T')
    ? new Date(dateInput)
    : new Date(`${dateInput}T00:00:00`)
  return isOnOrAfterCutoff(parsed, cutoff)
}
