'use client'

import { useMemo } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type StrengthStatPoint = {
  exercise_name: string
  measurement_value: number
  measurement_unit: string
  recorded_at: string
}

type PointMeta = {
  pct: number
  value: number
  baseline: number
  unit: string
}

// Distinct, readable colors for each exercise line.
const COLORS = [
  '#2563eb',
  '#16a34a',
  '#dc2626',
  '#9333ea',
  '#ea580c',
  '#0891b2',
  '#ca8a04',
  '#db2777',
  '#4f46e5',
  '#059669',
]

function formatDate(ms: number, withYear = false): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: withYear ? 'numeric' : '2-digit',
  })
}

function pctChangeFromBaseline(value: number, baseline: number): number | null {
  if (baseline === 0) return value === 0 ? 0 : null
  return ((value - baseline) / baseline) * 100
}

function formatPct(n: number): string {
  const rounded = Math.round(n * 10) / 10
  return `${rounded > 0 ? '+' : ''}${rounded}%`
}

export default function StrengthGrowthChart(props: { stats: StrengthStatPoint[] }) {
  const { stats } = props

  const { data, exercises, metaByTs } = useMemo(() => {
    const exerciseNames = Array.from(new Set(stats.map((s) => s.exercise_name)))

    const baselines = new Map<string, { value: number; unit: string }>()
    for (const name of exerciseNames) {
      const earliest = stats
        .filter((s) => s.exercise_name === name)
        .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())[0]
      if (earliest) {
        baselines.set(name, {
          value: earliest.measurement_value,
          unit: earliest.measurement_unit,
        })
      }
    }

    const byDay = new Map<number, Record<string, number>>()
    const meta = new Map<number, Map<string, PointMeta>>()

    const sortedStats = [...stats].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    )

    for (const s of sortedStats) {
      const baseline = baselines.get(s.exercise_name)
      if (!baseline) continue

      const pct = pctChangeFromBaseline(s.measurement_value, baseline.value)
      if (pct === null) continue

      const d = new Date(s.recorded_at)
      const ts = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
      const bucket = byDay.get(ts) ?? { ts }
      bucket[s.exercise_name] = pct
      byDay.set(ts, bucket)

      const dayMeta = meta.get(ts) ?? new Map<string, PointMeta>()
      dayMeta.set(s.exercise_name, {
        pct,
        value: s.measurement_value,
        baseline: baseline.value,
        unit: baseline.unit,
      })
      meta.set(ts, dayMeta)
    }

    const rows = Array.from(byDay.values()).sort((a, b) => a.ts - b.ts)
    return { data: rows, exercises: exerciseNames, metaByTs: meta }
  }, [stats])

  if (data.length === 0 || exercises.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Log strength stats over time to see your growth chart. Each saved update adds a point.
      </p>
    )
  }

  const singlePoint = data.length === 1

  return (
    <div className="w-full">
      {singlePoint && (
        <p className="mb-2 text-xs text-gray-500">
          Only one entry so far — log future updates to chart growth over time.
        </p>
      )}
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v: number) => formatDate(v)}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            minTickGap={28}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            width={52}
            tickFormatter={(v: number) => formatPct(v)}
            label={{
              value: 'Growth %',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 11, fill: '#6b7280' },
              offset: 4,
            }}
          />
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
            labelFormatter={(label) => formatDate(Number(label), true)}
            formatter={(value, name, item) => {
              const ts = (item?.payload as { ts?: number } | undefined)?.ts
              const pointMeta = ts != null ? metaByTs.get(ts)?.get(String(name)) : undefined
              if (pointMeta) {
                return [
                  `${formatPct(Number(value))} (${pointMeta.value} ${pointMeta.unit} vs ${pointMeta.baseline} ${pointMeta.unit} start)`,
                  name,
                ] as [string, string]
              }
              return [formatPct(Number(value)), name] as [string, string]
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          {exercises.map((ex, i) => (
            <Line
              key={ex}
              type="monotone"
              dataKey={ex}
              name={ex}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              connectNulls
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
