'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type NetWorthPoint = { date: string; netWorth: number }

function formatUsd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function formatAxisDate(iso: string, rangeDays: number): string {
  const d = new Date(iso + 'T12:00:00Z')
  if (rangeDays > 550) {
    return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function NetWorthOverTimeChart(props: {
  points: NetWorthPoint[]
  firstConnectionDate: string | null
  loading?: boolean
}) {
  const { points, firstConnectionDate, loading } = props

  if (loading) {
    return (
      <div className="h-[260px] flex items-center justify-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg bg-white/60">
        Loading chart…
      </div>
    )
  }

  if (!points.length) {
    return (
      <div className="h-[260px] flex items-center justify-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg bg-white/60">
        Connect a bank account to see net worth over time.
      </div>
    )
  }

  const min = Math.min(...points.map((p) => p.netWorth))
  const max = Math.max(...points.map((p) => p.netWorth))
  const pad = Math.max(Math.abs(max - min) * 0.08, 500)
  const yMin = min - pad
  const yMax = max + pad

  const start = points[0]?.date
  const end = points[points.length - 1]?.date
  let rangeDays = 30
  if (start && end) {
    rangeDays = Math.max(
      1,
      Math.round(
        (new Date(end + 'T12:00:00Z').getTime() - new Date(start + 'T12:00:00Z').getTime()) /
          (24 * 60 * 60 * 1000)
      )
    )
  }

  const chartData = points.map((p) => ({
    ...p,
    label: formatAxisDate(p.date, rangeDays),
  }))

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => formatAxisDate(v, rangeDays)}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            minTickGap={28}
          />
          <YAxis
            domain={[yMin, yMax]}
            tickFormatter={(v: number) => formatUsd(v)}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            width={72}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              fontSize: '13px',
            }}
            formatter={(value) => [formatUsd(Number(value ?? 0)), 'Net worth'] as [string, string]}
            labelFormatter={(label) => {
              const s = typeof label === 'string' ? label : String(label ?? '')
              return new Date(s + 'T12:00:00Z').toLocaleDateString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            }}
          />
          <Area
            type="monotone"
            dataKey="netWorth"
            stroke="#4f46e5"
            strokeWidth={2}
            fill="url(#nwFill)"
            dot={false}
            activeDot={{ r: 4, fill: '#4f46e5' }}
          />
        </AreaChart>
      </ResponsiveContainer>
      {firstConnectionDate && (
        <p className="text-xs text-gray-500 mt-2">
          Timeline starts when you first connected a bank (
          {new Date(firstConnectionDate + 'T12:00:00Z').toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
          ). Values are estimates from synced transactions.
        </p>
      )}
    </div>
  )
}
