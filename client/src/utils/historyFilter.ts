export type HistoryFilter = 'month' | '3months' | 'all'

function parseHistoryDate(value: string): Date | null {
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T00:00:00`)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(trimmed)
  return Number.isNaN(d.getTime()) ? null : d
}

function cutoffForFilter(filter: Exclude<HistoryFilter, 'all'>): Date {
  const cutoff = new Date()
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setMonth(cutoff.getMonth() - (filter === 'month' ? 1 : 3))
  return cutoff
}

export function matchesHistoryFilter(
  date: string | undefined | null,
  filter: HistoryFilter,
): boolean {
  if (filter === 'all') return true
  if (!date) return false
  const parsed = parseHistoryDate(date)
  if (!parsed) return false
  return parsed >= cutoffForFilter(filter)
}
