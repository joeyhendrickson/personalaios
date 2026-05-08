'use client'

import { useMemo } from 'react'
import { TrendingDown, TrendingUp, Minus, Clock } from 'lucide-react'
import type { FitnessBiometricRow } from './BiometricsSection'

type FitnessStat = {
  id: string
  stat_type: string
  exercise_name: string
  measurement_value: number
  measurement_unit: string
  recorded_at: string
}

function higherMeasurementIsBetter(stat: FitnessStat): boolean {
  const u = (stat.measurement_unit || '').toLowerCase()
  if (
    u.includes('min') ||
    u.includes('sec') ||
    u.includes('time') ||
    u.includes('/mile') ||
    u.includes('mile)') ||
    stat.stat_type === 'cardio'
  ) {
    if (u.includes('lb') || u.includes('kg') || u.includes('watt')) return true
    return false
  }
  return true
}

function compareBetter(prev: FitnessStat, curr: FitnessStat): 'improved' | 'declined' | 'flat' {
  const hi = higherMeasurementIsBetter(curr)
  const d = curr.measurement_value - prev.measurement_value
  if (Math.abs(d) < 1e-9) return 'flat'
  if (hi) {
    if (d > 0) return 'improved'
    if (d < 0) return 'declined'
  } else {
    if (d < 0) return 'improved'
    if (d > 0) return 'declined'
  }
  return 'flat'
}

export default function FitnessProgressPanel(props: {
  fitnessStats: FitnessStat[]
  biometrics: FitnessBiometricRow[]
}) {
  const { fitnessStats, biometrics } = props

  const statTrends = useMemo(() => {
    const byKey = new Map<string, FitnessStat[]>()
    for (const s of fitnessStats) {
      const key = `${s.stat_type}::${s.exercise_name}`
      const arr = byKey.get(key) || []
      arr.push(s)
      byKey.set(key, arr)
    }
    const rows: {
      key: string
      label: string
      unit: string
      entries: { at: string; value: number; trend?: 'improved' | 'declined' | 'flat' }[]
    }[] = []
    for (const [key, arr] of byKey) {
      const sorted = [...arr].sort(
        (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      )
      const entries = sorted.map((curr, i) => {
        let trend: 'improved' | 'declined' | 'flat' | undefined
        if (i > 0) trend = compareBetter(sorted[i - 1], curr)
        return {
          at: curr.recorded_at,
          value: curr.measurement_value,
          trend,
        }
      })
      const [, exerciseName] = key.split('::')
      rows.push({
        key,
        label: exerciseName,
        unit: sorted[sorted.length - 1]?.measurement_unit || '',
        entries,
      })
    }
    rows.sort((a, b) => a.label.localeCompare(b.label))
    return rows
  }, [fitnessStats])

  const energyTrend = useMemo(() => {
    const sorted = [...biometrics].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    )
    return sorted.map((b, i) => {
      let trend: 'improved' | 'declined' | 'flat' | undefined
      const ctx = b.contextual_energy_level_1_10
      if (i > 0 && typeof ctx === 'number') {
        const prev = sorted[i - 1].contextual_energy_level_1_10
        if (typeof prev === 'number') {
          if (ctx > prev) trend = 'improved'
          else if (ctx < prev) trend = 'declined'
          else trend = 'flat'
        }
      }
      return { at: b.recorded_at, contextual: ctx, self: b.energy_level_self_1_10, trend }
    })
  }, [biometrics])

  const mergedTimeline = useMemo(() => {
    type Ev =
      | { kind: 'stat'; at: string; title: string; detail: string }
      | {
          kind: 'bio'
          at: string
          title: string
          detail: string
        }
    const ev: Ev[] = []
    for (const s of fitnessStats) {
      ev.push({
        kind: 'stat',
        at: s.recorded_at,
        title: `${s.exercise_name} (${s.stat_type})`,
        detail: `${s.measurement_value} ${s.measurement_unit}`,
      })
    }
    for (const b of biometrics) {
      const ctx = b.contextual_energy_level_1_10
      ev.push({
        kind: 'bio',
        at: b.recorded_at,
        title: 'Biometrics snapshot',
        detail:
          typeof ctx === 'number'
            ? `Contextual energy ${ctx}/10` +
              (typeof b.sleep_hours === 'number' ? ` · sleep ${b.sleep_hours}h` : '')
            : 'Logged',
      })
    }
    ev.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    return ev.slice(0, 40)
  }, [fitnessStats, biometrics])

  const hasAnything = fitnessStats.length > 0 || biometrics.length > 0

  if (!hasAnything) {
    return (
      <div className="text-center py-12 text-gray-600">
        <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p>Log stats under Current Stats and biometrics to see trends here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Energy over time</h4>
        {energyTrend.length === 0 ? (
          <p className="text-sm text-gray-500">No biometrics yet.</p>
        ) : (
          <ul className="space-y-2">
            {energyTrend.map((e, idx) => (
              <li
                key={`${e.at}-${idx}`}
                className="flex flex-wrap items-center justify-between gap-2 text-sm border border-gray-100 rounded-lg p-3 bg-gray-50"
              >
                <span className="flex items-center gap-2 text-gray-700">
                  <Clock className="h-4 w-4 text-gray-400" />
                  {new Date(e.at).toLocaleString()}
                </span>
                <span className="font-medium">
                  Contextual {e.contextual ?? '—'}/10
                  {typeof e.self === 'number' ? ` · Self ${e.self}/10` : ''}
                </span>
                {e.trend === 'improved' && (
                  <span className="text-green-700 flex items-center gap-1 text-xs font-medium">
                    <TrendingUp className="h-4 w-4" /> Up vs prior
                  </span>
                )}
                {e.trend === 'declined' && (
                  <span className="text-amber-800 flex items-center gap-1 text-xs font-medium">
                    <TrendingDown className="h-4 w-4" /> Down vs prior
                  </span>
                )}
                {e.trend === 'flat' && (
                  <span className="text-gray-500 flex items-center gap-1 text-xs">
                    <Minus className="h-4 w-4" /> Flat vs prior
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Performance by exercise</h4>
        <div className="space-y-4">
          {statTrends.map((row) => (
            <div key={row.key} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="font-medium text-gray-900 mb-2">
                {row.label} <span className="text-gray-500 font-normal text-sm">({row.unit})</span>
              </div>
              <ul className="space-y-1.5">
                {row.entries.map((e, i) => (
                  <li
                    key={`${row.key}-${e.at}-${i}`}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-700"
                  >
                    <span>{new Date(e.at).toLocaleString()}</span>
                    <span className="font-semibold">{e.value}</span>
                    {e.trend === 'improved' && (
                      <span className="text-green-700 text-xs font-medium flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" /> Improved vs prior entry
                      </span>
                    )}
                    {e.trend === 'declined' && (
                      <span className="text-red-700 text-xs font-medium flex items-center gap-1">
                        <TrendingDown className="h-3.5 w-3.5" /> Lower than prior entry
                      </span>
                    )}
                    {e.trend === 'flat' && (
                      <span className="text-gray-500 text-xs flex items-center gap-1">
                        <Minus className="h-3.5 w-3.5" /> Same as prior
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {statTrends.length === 0 && (
            <p className="text-sm text-gray-500">No fitness stats yet.</p>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          Recent activity (stats & biometrics)
        </h4>
        <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
          {mergedTimeline.map((ev, i) => (
            <li
              key={`${ev.kind}-${ev.at}-${i}`}
              className="px-4 py-3 bg-white text-sm flex flex-col sm:flex-row sm:justify-between gap-1"
            >
              <span className="text-gray-500">{new Date(ev.at).toLocaleString()}</span>
              <span className="font-medium text-gray-900">{ev.title}</span>
              <span className="text-gray-700">{ev.detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
