export type NetWorthPoint = { date: string; netWorth: number }

export type NetWorthPeriodChange = {
  startDate: string
  endDate: string
  startValue: number | null
  endValue: number | null
  change: number | null
  changePct: number | null
}

function valueOnOrBefore(points: NetWorthPoint[], date: string): number | null {
  let last: number | null = null
  for (const point of points) {
    if (point.date > date) break
    last = point.netWorth
  }
  return last
}

function valueOnOrAfter(points: NetWorthPoint[], date: string): number | null {
  for (const point of points) {
    if (point.date >= date) return point.netWorth
  }
  return null
}

export function parseNetWorthPeriodChange(raw: unknown): NetWorthPeriodChange | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const record = raw as Record<string, unknown>
  const startDate = typeof record.startDate === 'string' ? record.startDate : ''
  const endDate = typeof record.endDate === 'string' ? record.endDate : ''
  if (!startDate || !endDate) return null

  const asNullableNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    return null
  }

  return {
    startDate,
    endDate,
    startValue: asNullableNumber(record.startValue),
    endValue: asNullableNumber(record.endValue),
    change: asNullableNumber(record.change),
    changePct: asNullableNumber(record.changePct),
  }
}

/** Net worth at the start vs end of an analysis window. */
export function netWorthChangeForPeriod(
  points: NetWorthPoint[],
  startDate: string,
  endDate: string
): NetWorthPeriodChange {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const startValue = valueOnOrBefore(sorted, startDate) ?? valueOnOrAfter(sorted, startDate)
  const endValue = valueOnOrBefore(sorted, endDate) ?? valueOnOrAfter(sorted, endDate)
  if (startValue == null || endValue == null) {
    return { startDate, endDate, startValue, endValue, change: null, changePct: null }
  }
  const change = endValue - startValue
  const changePct = startValue === 0 ? null : (change / Math.abs(startValue)) * 100
  return { startDate, endDate, startValue, endValue, change, changePct }
}
