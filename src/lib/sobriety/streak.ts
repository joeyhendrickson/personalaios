export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export type StreakLog = {
  log_date: string
  drank: boolean
}

/**
 * Consecutive sober days ending today or yesterday.
 * A drink day breaks the streak. Missing days also break it.
 */
export function computeSoberStreak(logs: StreakLog[], today: string): number {
  const soberDates = new Set(logs.filter((l) => !l.drank).map((l) => l.log_date))
  if (soberDates.size === 0) return 0

  const yesterday = addDays(today, -1)
  let cursor = soberDates.has(today) ? today : soberDates.has(yesterday) ? yesterday : null
  if (!cursor) return 0

  let streak = 0
  while (soberDates.has(cursor)) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

export function countSoberDays(logs: StreakLog[]): number {
  return logs.filter((l) => !l.drank).length
}
