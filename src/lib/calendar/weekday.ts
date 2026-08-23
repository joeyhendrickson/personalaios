import { ALL_DAYS, type DayKey } from '@/lib/calendar/preferences'

/** Sunday=0 … Saturday=6, matching Date#getDay(). */
export const WEEKDAY_INDEX: Record<DayKey, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
}

/** Accept mon, Monday, Mon, TUE, etc. */
export function normalizeWeekday(raw: string | undefined, fallback: DayKey = 'mon'): DayKey {
  const value = (raw ?? '').trim().toLowerCase()
  if ((ALL_DAYS as readonly string[]).includes(value)) return value as DayKey
  const three = value.slice(0, 3)
  if ((ALL_DAYS as readonly string[]).includes(three)) return three as DayKey
  return fallback
}

export function nextOccurrence(weekday: string, startTime: string, now = new Date()): Date {
  const day = normalizeWeekday(weekday)
  const [hoursRaw, minutesRaw] = startTime.split(':')
  const hours = Number.parseInt(hoursRaw, 10)
  const minutes = Number.parseInt(minutesRaw, 10)
  const target = WEEKDAY_INDEX[day]
  const next = new Date(now)
  next.setSeconds(0, 0)
  next.setHours(Number.isFinite(hours) ? hours : 9, Number.isFinite(minutes) ? minutes : 0, 0, 0)
  let diff = (target - next.getDay() + 7) % 7
  if (diff === 0 && next.getTime() <= now.getTime()) diff = 7
  next.setDate(next.getDate() + diff)
  return next
}

export function toWallClockDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
