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

export default function StrengthGrowthChart(props: { stats: StrengthStatPoint[] }) {
  const { stats } = props

  const { data, exercises, unitFor } = useMemo(() => {
    const exerciseNames = Array.from(new Set(stats.map((s) => s.exercise_name)))

    const units = new Map<string, string>()
    for (const s of stats) {
      if (!units.has(s.exercise_name)) units.set(s.exercise_name, s.measurement_unit)
    }

    // Group entries by calendar day so multiple same-day logs collapse to one node.
    const byDay = new Map<number, Record<string, number>>()
    for (const s of stats) {
      const d = new Date(s.recorded_at)
      const ts = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
      const bucket = byDay.get(ts) ?? { ts }
      bucket[s.exercise_name] = s.measurement_value
      byDay.set(ts, bucket)
    }

    const rows = Array.from(byDay.values()).sort((a, b) => a.ts - b.ts)
    return { data: rows, exercises: exerciseNames, unitFor: units }
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
        <LineChart data={data} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
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
            width={44}
          />
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
            labelFormatter={(label) => formatDate(Number(label), true)}
            formatter={(value, name) =>
              [`${value} ${unitFor.get(String(name)) ?? ''}`.trim(), name] as [string, string]
            }
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
