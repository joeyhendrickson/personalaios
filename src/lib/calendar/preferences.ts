export const ALL_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export type DayKey = (typeof ALL_DAYS)[number]

export type CalendarTimeWindow = {
  id: string
  start_hour: number
  end_hour: number
  days: DayKey[]
}

export type CalendarPreferences = {
  windows: CalendarTimeWindow[]
  start_hour: number
  end_hour: number
  days: DayKey[]
}

const DEFAULT_START = 5
const DEFAULT_END = 24

export function newWindowId(): string {
  return `w-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function createDefaultWindow(): CalendarTimeWindow {
  return {
    id: newWindowId(),
    start_hour: DEFAULT_START,
    end_hour: DEFAULT_END,
    days: [...ALL_DAYS],
  }
}

export function clampHour(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : parseInt(String(value), 10)
  if (Number.isNaN(n)) return fallback
  return Math.max(0, Math.min(24, n))
}

export function sanitizeDays(days: unknown): DayKey[] {
  if (!Array.isArray(days)) return [...ALL_DAYS]
  const filtered = days.filter((d): d is DayKey => ALL_DAYS.includes(d as DayKey))
  return filtered.length ? filtered : [...ALL_DAYS]
}

export function sanitizeWindow(raw: unknown, index: number): CalendarTimeWindow {
  const r = (raw ?? {}) as Record<string, unknown>
  const start_hour = clampHour(r.start_hour, DEFAULT_START)
  let end_hour = clampHour(r.end_hour, DEFAULT_END)
  if (end_hour <= start_hour) end_hour = Math.min(24, start_hour + 1)
  return {
    id: typeof r.id === 'string' && r.id ? r.id : `w-${index}`,
    start_hour,
    end_hour,
    days: sanitizeDays(r.days),
  }
}

export function normalizePreferences(
  row: {
    start_hour?: number | null
    end_hour?: number | null
    days?: string[] | null
    time_windows?: unknown
    windows?: unknown
  } | null
): CalendarPreferences {
  const windowsFromApi = row?.windows
  if (Array.isArray(windowsFromApi) && windowsFromApi.length > 0) {
    const windows = windowsFromApi.map(sanitizeWindow)
    const primary = windows[0]
    return {
      windows,
      start_hour: primary.start_hour,
      end_hour: primary.end_hour,
      days: primary.days,
    }
  }

  const windowsRaw = row?.time_windows
  let windows: CalendarTimeWindow[]

  if (Array.isArray(windowsRaw) && windowsRaw.length > 0) {
    windows = windowsRaw.map(sanitizeWindow)
  } else {
    const start_hour = clampHour(row?.start_hour, DEFAULT_START)
    let end_hour = clampHour(row?.end_hour, DEFAULT_END)
    if (end_hour <= start_hour) end_hour = Math.min(24, start_hour + 1)
    windows = [
      {
        id: 'default',
        start_hour,
        end_hour,
        days: sanitizeDays(row?.days),
      },
    ]
  }

  const primary = windows[0]
  return {
    windows,
    start_hour: primary.start_hour,
    end_hour: primary.end_hour,
    days: primary.days,
  }
}

export function sanitizeWindowsInput(body: unknown): CalendarTimeWindow[] {
  const raw = Array.isArray(body)
    ? body
    : Array.isArray((body as { windows?: unknown })?.windows)
      ? (body as { windows: unknown[] }).windows
      : null
  if (!raw?.length) return [createDefaultWindow()]
  const windows = raw.map(sanitizeWindow).filter((w) => w.days.length > 0)
  return windows.length ? windows : [createDefaultWindow()]
}

export function formatWindowsForPrompt(
  windows: CalendarTimeWindow[],
  hourLabel: (h: number) => string
): string {
  return windows
    .map((w, i) => {
      return `Window ${i + 1}: ${w.days.join(', ')} — ${hourLabel(w.start_hour)} to ${hourLabel(w.end_hour)}`
    })
    .join('\n')
}

export function parseStartTimeMinutes(startTime: string): number {
  const [hh, mm] = startTime.split(':').map((x) => parseInt(x, 10))
  return (hh || 0) * 60 + (mm || 0)
}

/** Whether a scheduled item falls inside a window's allowed days and start time. */
export function matchesTimeWindow(
  weekday: string,
  startTime: string,
  window: CalendarTimeWindow
): boolean {
  if (!window.days.includes(weekday as DayKey)) return false
  const mins = parseStartTimeMinutes(startTime)
  const startMins = window.start_hour * 60
  const endMins = window.end_hour * 60
  return mins >= startMins && mins < endMins
}

export function findMatchingWindow(
  weekday: string,
  startTime: string,
  windows: CalendarTimeWindow[]
): CalendarTimeWindow | null {
  return windows.find((w) => matchesTimeWindow(weekday, startTime, w)) ?? null
}

export function defaultWeekdayForWindow(window: CalendarTimeWindow): DayKey {
  return window.days[0] ?? 'mon'
}

export function defaultStartTimeForWindow(window: CalendarTimeWindow): string {
  return `${String(window.start_hour).padStart(2, '0')}:00`
}

export function snapRecToWindow(
  window: CalendarTimeWindow,
  rec?: { weekday?: string; start_time?: string }
): { weekday: DayKey; start_time: string } {
  const weekday = window.days.includes(rec?.weekday as DayKey)
    ? (rec!.weekday as DayKey)
    : defaultWeekdayForWindow(window)
  let start_time = rec?.start_time ?? defaultStartTimeForWindow(window)
  if (!matchesTimeWindow(weekday, start_time, window)) {
    start_time = defaultStartTimeForWindow(window)
  }
  return { weekday, start_time }
}

export function assignWindowId(
  weekday: string,
  startTime: string,
  windows: CalendarTimeWindow[]
): string | null {
  return findMatchingWindow(weekday, startTime, windows)?.id ?? windows[0]?.id ?? null
}

export function groupItemsByWindow<T extends { weekday: string; start_time: string }>(
  items: T[],
  windows: CalendarTimeWindow[]
): { window: CalendarTimeWindow; items: T[] }[] {
  const grouped = windows.map((window) => ({
    window,
    items: items.filter((item) => matchesTimeWindow(item.weekday, item.start_time, window)),
  }))
  return grouped.filter((g) => g.items.length > 0)
}

export function findUnmatchedWindowItems<T extends { weekday: string; start_time: string }>(
  items: T[],
  windows: CalendarTimeWindow[]
): T[] {
  return items.filter(
    (item) => !windows.some((w) => matchesTimeWindow(item.weekday, item.start_time, w))
  )
}
