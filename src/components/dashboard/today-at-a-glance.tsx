'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Cake, Calendar, Heart, Mountain, Sparkles } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import {
  attachMonthChange,
  formatUsd,
  type GlanceFinance,
  type GlanceFocus,
  type GlanceHealth,
  type GlancePlanItem,
  type GlanceUpcomingItem,
} from '@/lib/dashboard/glance'
import { cn } from '@/lib/utils'

type GlanceResponse = {
  firstName: string
  avatarUrl: string | null
  greeting: 'morning' | 'afternoon' | 'evening'
  plan: { items: GlancePlanItem[]; remaining: number; total: number; completedToday: number }
  health: GlanceHealth
  finance: GlanceFinance
  upcoming: GlanceUpcomingItem[]
  focus: GlanceFocus | null
  insight: string
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const series = values.length === 1 ? [values[0]!, values[0]!] : values
  if (series.length < 2) return <div className="h-14" />
  const max = Math.max(...series, 1)
  const min = Math.min(...series, 0)
  const span = Math.max(max - min, 1)
  const width = 220
  const height = 56
  const points = series.map((value, index) => {
    const x = (index / (series.length - 1)) * width
    const y = height - ((value - min) / span) * (height - 8) - 4
    return `${x},${y}`
  })
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-14 w-full" aria-hidden="true">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        points={points.join(' ')}
      />
    </svg>
  )
}

function ProgressRing({ percent }: { percent: number }) {
  const size = 148
  const stroke = 12
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.max(0, Math.min(100, percent)) / 100) * circumference
  return (
    <div className="relative mx-auto h-[148px] w-[148px]">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e6e8eb"
          strokeWidth={stroke}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#22c55e"
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{percent}%</span>
        <span className="text-xs text-gray-500">Complete</span>
      </div>
    </div>
  )
}

function Card({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'flex min-h-[280px] flex-col rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)]',
        className
      )}
    >
      <h2 className="mb-4 text-[15px] font-semibold text-gray-800">{title}</h2>
      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  )
}

export function TodayAtAGlance({
  onProfile,
}: {
  onProfile?: (profile: {
    firstName: string
    avatarUrl: string | null
    greeting: 'morning' | 'afternoon' | 'evening'
  }) => void
}) {
  const { t } = useLanguage()
  const [data, setData] = useState<GlanceResponse | null>(null)
  const [financeSparkline, setFinanceSparkline] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [completingId, setCompletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard/glance', { credentials: 'same-origin' })
      if (!response.ok) return
      const json = (await response.json()) as GlanceResponse
      setData(json)
      onProfile?.({
        firstName: json.firstName,
        avatarUrl: json.avatarUrl,
        greeting: json.greeting,
      })
    } catch (error) {
      console.error('Failed to load Today at a Glance', error)
    } finally {
      setLoading(false)
    }
  }, [onProfile])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!data?.finance.netWorth) return
    let cancelled = false
    ;(async () => {
      try {
        const response = await fetch('/api/budget/net-worth-history', {
          credentials: 'same-origin',
        })
        if (!response.ok) return
        const json = await response.json()
        const points = Array.isArray(json.points) ? json.points : []
        const today =
          typeof json.today === 'string' ? json.today : new Date().toISOString().slice(0, 10)
        if (cancelled || points.length === 0) return
        setData((current) =>
          current
            ? {
                ...current,
                finance: attachMonthChange(current.finance, points, today),
              }
            : current
        )
        setFinanceSparkline(points.slice(-12).map((point: { netWorth: number }) => point.netWorth))
      } catch {
        /* chart is optional */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [data?.finance.netWorth])

  const completeTask = async (id: string) => {
    setCompletingId(id)
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })
      if (response.ok) {
        window.dispatchEvent(new CustomEvent('dashboard-refreshed'))
        await load()
      }
    } finally {
      setCompletingId(null)
    }
  }

  const planProgress =
    data && data.plan.total > 0 ? Math.round((data.plan.completedToday / data.plan.total) * 100) : 0

  return (
    <div className="px-4 pb-8 pt-6 sm:px-8">
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-[#1f2933] sm:text-4xl">
        {t('glance.title')}
      </h1>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Card title={t('glance.todaysPlan')}>
          {loading ? (
            <p className="text-sm text-gray-500">{t('common.loading')}</p>
          ) : data?.plan.items.length ? (
            <>
              <ul className="flex-1 space-y-4">
                {data.plan.items.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3">
                    <label className="flex min-w-0 items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label={`Complete ${item.title}`}
                        disabled={item.kind !== 'task' || completingId === item.id}
                        checked={item.done}
                        onChange={() => {
                          if (item.kind === 'task') void completeTask(item.id)
                        }}
                        className="mt-1 h-4 w-4 rounded-full border-gray-300 text-emerald-600"
                      />
                      <span className="text-sm font-medium text-gray-800">{item.title}</span>
                    </label>
                    {item.timeLabel && (
                      <span className="shrink-0 text-xs text-gray-400">{item.timeLabel}</span>
                    )}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-center gap-3">
                <p className="text-sm text-gray-500">
                  {t('glance.tasksLeft', { count: data.plan.remaining })}
                </p>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${planProgress}%` }}
                  />
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              {t('glance.noTasks')}{' '}
              <Link href="/dashboard#tasks" className="text-blue-600 hover:underline">
                {t('glance.addTasks')}
              </Link>
            </p>
          )}
        </Card>

        <Card title={t('glance.health')}>
          {data?.health.heartValue || data?.health.sleepLabel || data?.health.steps ? (
            <>
              <div className="mb-4 flex items-center gap-2">
                <Heart className="h-7 w-7 fill-red-500 text-red-500" />
                <span className="text-2xl font-bold text-gray-900">
                  {data.health.heartValue ?? '—'} {data.health.heartLabel || ''}
                </span>
              </div>
              <div className="mb-4 grid grid-cols-3 gap-2 text-center text-xs text-gray-500">
                <div>
                  <p className="font-medium text-gray-800">{data.health.sleepLabel || '—'}</p>
                  <p>Sleep</p>
                </div>
                <div>
                  <p className="font-medium text-gray-800">
                    {data.health.steps != null ? data.health.steps.toLocaleString() : '—'}
                  </p>
                  <p>Steps</p>
                </div>
                <div>
                  <p className="font-medium text-gray-800">
                    {data.health.readiness != null ? Math.round(data.health.readiness) : '—'}
                  </p>
                  <p>Readiness</p>
                </div>
              </div>
              <Sparkline values={data.health.sparkline} color="#3b82f6" />
            </>
          ) : (
            <p className="text-sm text-gray-500">
              {t('glance.noHealth')}{' '}
              <Link href="/modules/fitness-tracker" className="text-blue-600 hover:underline">
                {t('glance.openFitness')}
              </Link>
            </p>
          )}
        </Card>

        <Card title={t('glance.financial')}>
          {data?.finance.netWorth != null ? (
            <>
              <p className="text-sm text-gray-500">Net Worth</p>
              <p className="text-3xl font-bold text-gray-900">{formatUsd(data.finance.netWorth)}</p>
              {data.finance.monthChangePct != null && (
                <p
                  className={cn(
                    'mt-1 text-sm font-medium',
                    data.finance.monthChangePct >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}
                >
                  {data.finance.monthChangePct >= 0 ? '+' : ''}
                  {data.finance.monthChangePct}% this month
                </p>
              )}
              <div className="my-3">
                <Sparkline
                  values={
                    financeSparkline.length > 0
                      ? financeSparkline
                      : data.finance.netWorth != null
                        ? [data.finance.netWorth]
                        : []
                  }
                  color="#22c55e"
                />
              </div>
              <div className="mt-auto flex justify-between text-sm text-gray-500">
                <span>Investments: {formatUsd(data.finance.investments || 0)}</span>
                <span>Cash: {formatUsd(data.finance.cash || 0)}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              {t('glance.noFinance')}{' '}
              <Link href="/modules/budget-optimizer" className="text-blue-600 hover:underline">
                {t('glance.openBudget')}
              </Link>
            </p>
          )}
        </Card>

        <Card title={t('glance.upcoming')}>
          {data?.upcoming.length ? (
            <>
              <ul className="flex-1 space-y-4">
                {data.upcoming.map((item, index) => {
                  const Icon = index === 0 ? Calendar : index === 1 ? Mountain : Cake
                  return (
                    <li key={item.id} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.title}</p>
                        <p className="text-xs text-gray-400">{item.dateLabel}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <Link
                href="/modules/calendar-ai"
                className="mt-4 text-sm font-medium text-blue-600 hover:underline"
              >
                {t('glance.viewCalendar')}
              </Link>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              {t('glance.noUpcoming')}{' '}
              <Link href="/modules/calendar-ai" className="text-blue-600 hover:underline">
                {t('glance.viewCalendar')}
              </Link>
            </p>
          )}
        </Card>

        <Card title={t('glance.topFocus')}>
          {data?.focus ? (
            <>
              <p className="mb-3 text-center text-lg font-semibold text-gray-900">
                {data.focus.title}
              </p>
              <ProgressRing percent={data.focus.percent} />
              <p className="mt-auto pt-3 text-center text-sm text-gray-500">
                {data.focus.nextStep
                  ? `${t('glance.nextStep')}: ${data.focus.nextStep}`
                  : t('glance.keepGoing')}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              {t('glance.noFocus')}{' '}
              <Link href="/dashboard#workspace" className="text-blue-600 hover:underline">
                {t('glance.addGoal')}
              </Link>
            </p>
          )}
        </Card>

        <Card title={t('glance.aiInsight')}>
          <div className="mb-3 flex justify-end">
            <Sparkles className="h-5 w-5 text-gold" />
          </div>
          <p className="text-[15px] leading-relaxed text-gray-600">
            {loading ? t('common.loading') : data?.insight}
          </p>
        </Card>
      </div>
    </div>
  )
}
