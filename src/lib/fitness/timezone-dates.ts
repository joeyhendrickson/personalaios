/**
 * Calendar-date helpers aligned with a user's IANA timezone.
 * Google Health sync and energy history must use the same "today" definition.
 */

export function addDaysToYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + delta)
  return dt.toISOString().slice(0, 10)
}

/** Parse YYYY-MM-DD as UTC midnight so ymd() on Vercel (UTC) returns the same string. */
export function dateFromYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
