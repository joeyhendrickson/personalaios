export type DatedValue = { date: string; value: number }

export type EnergyGrowthSeriesKey = 'Energy' | 'Net Worth' | 'Points'

export type EnergyGrowthRow = {
  ts: number
  Energy?: number
  'Net Worth'?: number
  Points?: number
}

export type EnergyGrowthPointMeta = {
  pct: number
  value: number
  baseline: number
  unit: string
}

function toIsoDate(input: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return input.slice(0, 10)
  return d.toISOString().slice(0, 10)
}

export function energyLevelForRow(row: {
  contextual_energy_level_1_10?: number | null
  energy_level_self_1_10?: number | null
}): number | null {
  if (typeof row.contextual_energy_level_1_10 === 'number') return row.contextual_energy_level_1_10
  if (typeof row.energy_level_self_1_10 === 'number') return row.energy_level_self_1_10
  return null
}

/** Latest energy reading per UTC day. Prefers contextual energy, then self-reported. */
export function lastEnergyByDay(
  rows: Array<{
    recorded_at: string
    contextual_energy_level_1_10?: number | null
    energy_level_self_1_10?: number | null
  }>
): DatedValue[] {
  const byDay = new Map<string, { at: number; value: number }>()
  for (const row of rows) {
    const value = energyLevelForRow(row)
    if (value == null) continue
    const date = toIsoDate(row.recorded_at)
    const at = new Date(row.recorded_at).getTime()
    const existing = byDay.get(date)
    if (!existing || at >= existing.at) {
      byDay.set(date, { at: Number.isNaN(at) ? 0 : at, value })
    }
  }
  return Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, item]) => ({ date, value: item.value }))
}

export function groupEarnedPointsByDay(
  entries: Array<{ points?: number | null; created_at: string }>
): DatedValue[] {
  const byDay = new Map<string, number>()
  for (const entry of entries) {
    const points = Number(entry.points) || 0
    if (points <= 0) continue
    const date = toIsoDate(entry.created_at)
    byDay.set(date, (byDay.get(date) || 0) + points)
  }
  return Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value }))
}

export function iterDatesInclusive(from: string, to: string): string[] {
  if (from > to) return []
  const out: string[] = []
  const [y, m, d] = from.split('-').map(Number)
  const cursor = new Date(Date.UTC(y, m - 1, d))
  const end = to
  while (cursor.toISOString().slice(0, 10) <= end) {
    out.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
    if (out.length > 800) break
  }
  return out
}

export function fillMissingDays(points: DatedValue[], from: string, to: string): DatedValue[] {
  const map = new Map(points.map((p) => [p.date, p.value]))
  return iterDatesInclusive(from, to).map((date) => ({ date, value: map.get(date) ?? 0 }))
}

export function pctChangeFromBaseline(value: number, baseline: number): number | null {
  if (baseline === 0) return value === 0 ? 0 : null
  return ((value - baseline) / Math.abs(baseline)) * 100
}

function firstNonZero(points: DatedValue[]): number | null {
  for (const point of points) {
    if (point.value !== 0) return point.value
  }
  return points[0]?.value ?? null
}

function lookupOnOrBefore(points: DatedValue[], date: string): number | undefined {
  let last: number | undefined
  for (const point of points) {
    if (point.date > date) break
    last = point.value
  }
  return last
}

export function buildEnergyGrowthChart(input: {
  energy: DatedValue[]
  netWorth?: DatedValue[]
  dailyPoints?: DatedValue[]
  includeNetWorth: boolean
  includePoints: boolean
}): {
  rows: EnergyGrowthRow[]
  metaByTs: Map<number, Map<EnergyGrowthSeriesKey, EnergyGrowthPointMeta>>
} {
  if (input.energy.length === 0) {
    return { rows: [], metaByTs: new Map() }
  }

  const energyFrom = input.energy[0]!.date
  const energyTo = input.energy[input.energy.length - 1]!.date
  const dates = new Set(input.energy.map((e) => e.date))

  if (input.includeNetWorth && input.netWorth?.length) {
    for (const point of input.netWorth) {
      if (point.date >= energyFrom && point.date <= energyTo) dates.add(point.date)
    }
  }

  if (input.includePoints) {
    for (const date of iterDatesInclusive(energyFrom, energyTo)) dates.add(date)
  }

  const orderedDates = Array.from(dates).sort()
  const energyBaseline = input.energy[0]!.value
  const netWorthInRange = (input.netWorth || []).filter(
    (p) => p.date >= energyFrom && p.date <= energyTo
  )
  const netWorthBaseline = firstNonZero(netWorthInRange)
  const filledPoints = input.dailyPoints
    ? fillMissingDays(input.dailyPoints, energyFrom, energyTo)
    : []
  const pointsBaseline =
    firstNonZero(filledPoints.filter((p) => p.value > 0)) ?? firstNonZero(filledPoints)

  const rows: EnergyGrowthRow[] = []
  const metaByTs = new Map<number, Map<EnergyGrowthSeriesKey, EnergyGrowthPointMeta>>()

  for (const date of orderedDates) {
    const ts = new Date(`${date}T12:00:00.000Z`).getTime()
    const row: EnergyGrowthRow = { ts }
    const dayMeta = new Map<EnergyGrowthSeriesKey, EnergyGrowthPointMeta>()

    const energy = lookupOnOrBefore(input.energy, date)
    if (energy != null) {
      const pct = pctChangeFromBaseline(energy, energyBaseline)
      if (pct != null) {
        row.Energy = pct
        dayMeta.set('Energy', { pct, value: energy, baseline: energyBaseline, unit: '/10' })
      }
    }

    if (input.includeNetWorth && netWorthBaseline != null) {
      const netWorth = lookupOnOrBefore(netWorthInRange, date)
      if (netWorth != null) {
        const pct = pctChangeFromBaseline(netWorth, netWorthBaseline)
        if (pct != null) {
          row['Net Worth'] = pct
          dayMeta.set('Net Worth', {
            pct,
            value: netWorth,
            baseline: netWorthBaseline,
            unit: 'USD',
          })
        }
      }
    }

    if (input.includePoints && pointsBaseline != null) {
      const points = filledPoints.find((p) => p.date === date)?.value
      if (points != null) {
        const pct = pctChangeFromBaseline(points, pointsBaseline)
        if (pct != null) {
          row.Points = pct
          dayMeta.set('Points', { pct, value: points, baseline: pointsBaseline, unit: 'pts' })
        }
      }
    }

    if (dayMeta.size > 0) {
      rows.push(row)
      metaByTs.set(ts, dayMeta)
    }
  }

  return { rows, metaByTs }
}
