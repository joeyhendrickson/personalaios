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
import {
  buildEnergyGrowthChart,
  type DatedValue,
  type EnergyGrowthSeriesKey,
} from '@/lib/fitness/energy-growth-chart'

const SERIES_COLOR: Record<EnergyGrowthSeriesKey, string> = {
  Energy: '#2563eb',
  'Net Worth': '#16a34a',
  Points: '#ea580c',
}

function formatDate(ms: number, withYear = false): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: withYear ? 'numeric' : '2-digit',
  })
}

function formatPct(n: number): string {
  const rounded = Math.round(n * 10) / 10
  return `${rounded > 0 ? '+' : ''}${rounded}%`
}

function formatActual(value: number, unit: string): string {
  if (unit === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value)
  }
  if (unit === '/10') return `${value}/10`
  return `${value} ${unit}`
}

export default function EnergyGrowthChart(props: {
  energy: DatedValue[]
  netWorth?: DatedValue[]
  dailyPoints?: DatedValue[]
  includeNetWorth: boolean
  includePoints: boolean
}) {
  const { rows, metaByTs } = useMemo(
    () =>
      buildEnergyGrowthChart({
        energy: props.energy,
        netWorth: props.netWorth,
        dailyPoints: props.dailyPoints,
        includeNetWorth: props.includeNetWorth,
        includePoints: props.includePoints,
      }),
    [props.energy, props.netWorth, props.dailyPoints, props.includeNetWorth, props.includePoints]
  )

  const series: EnergyGrowthSeriesKey[] = ['Energy']
  if (props.includeNetWorth) series.push('Net Worth')
  if (props.includePoints) series.push('Points')

  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Log energy in biometrics over time to see this growth chart.
      </p>
    )
  }

  return (
    <div className="w-full">
      {rows.length === 1 && (
        <p className="mb-2 text-xs text-gray-500">
          Only one energy day so far — later logs will show change over time.
        </p>
      )}
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={rows} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
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
              const pointMeta =
                ts != null ? metaByTs.get(ts)?.get(name as EnergyGrowthSeriesKey) : undefined
              if (pointMeta) {
                return [
                  `${formatPct(Number(value))} (${formatActual(pointMeta.value, pointMeta.unit)} vs ${formatActual(pointMeta.baseline, pointMeta.unit)} start)`,
                  name,
                ] as [string, string]
              }
              return [formatPct(Number(value)), name] as [string, string]
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          {series.map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={key}
              stroke={SERIES_COLOR[key]}
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
