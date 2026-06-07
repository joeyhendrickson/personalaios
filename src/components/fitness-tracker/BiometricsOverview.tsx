'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Footprints,
  Heart,
  Moon,
  Zap,
  Clock,
  Watch,
  PencilLine,
  TrendingUp,
  Loader2,
  X,
  Info,
} from 'lucide-react'
import type { FitnessBiometricRow } from './BiometricsSection'
import { computeContextualEnergyLevel } from '@/lib/fitness/contextual-energy'
import { energyModeFromScore } from '@/lib/fitness/adapt-workout-structure'
import {
  isGoogleHealthRow,
  pickLatestBiometricsDisplay,
  summarizeWeeklyGoogleHealth,
} from '@/lib/fitness/normalize-biometrics'
import { formatScoreFactors } from '@/lib/fitness/energy-stress-labels'

type EnergyHistoryEntry = {
  id: string
  log_date: string
  self_energy_level: number
  stress_level: number
  sleep_hours: number | null
  resting_heart_rate: number | null
  steps: number | null
  adjustments_applied: string[]
  recorded_at: string
}

function contextualFor(row: FitnessBiometricRow): { score: number; rationale: string[] } {
  const computed = computeContextualEnergyLevel({
    sleep_hours: row.sleep_hours ?? undefined,
    blood_pressure_systolic: row.blood_pressure_systolic ?? undefined,
    blood_pressure_diastolic: row.blood_pressure_diastolic ?? undefined,
    resting_heart_rate: row.resting_heart_rate ?? undefined,
    stress_level_1_10: row.stress_level_1_10 ?? undefined,
    energy_level_self_1_10: row.energy_level_self_1_10 ?? undefined,
  })
  const score =
    typeof row.contextual_energy_level_1_10 === 'number'
      ? row.contextual_energy_level_1_10
      : computed.contextual_energy_level_1_10
  return { score, rationale: computed.rationale }
}

const MODE_COPY: Record<'low' | 'standard' | 'high', { label: string; detail: string }> = {
  low: {
    label: 'Easier day',
    detail:
      'Lower readiness today — the adapted routine trims a set per exercise, eases rep targets, and adds rest to protect recovery.',
  },
  standard: {
    label: 'Standard day',
    detail: 'Readiness looks steady — follow your plan as written. No adjustments needed.',
  },
  high: {
    label: 'Higher-capacity day',
    detail:
      'Strong readiness today — the adapted routine adds a modest volume bump where it supports your goals. Keep form clean.',
  },
}

function sourceLabel(source?: string | null): string {
  if (source === 'google_health') return 'Google Health'
  if (source === 'daily_snapshot') return 'Daily snapshot'
  if (source === 'manual' || !source) return 'Manual'
  return source
}

function formatLogDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function Metric(props: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">
        {props.icon}
        {props.label}
      </div>
      <p className={`mt-1 text-lg font-semibold ${props.accent || 'text-gray-900'}`}>
        {props.value}
      </p>
    </div>
  )
}

function ClickableScoreMetric(props: {
  icon: React.ReactNode
  label: string
  value: string
  accent?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      title={`How was ${props.label.toLowerCase()} calculated?`}
      className="rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:border-amber-300 hover:bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">
          {props.icon}
          {props.label}
        </div>
        <Info className="h-3.5 w-3.5 shrink-0 text-gray-400" />
      </div>
      <p
        className={`mt-1 text-lg font-semibold underline decoration-dotted underline-offset-4 ${props.accent || 'text-gray-900'}`}
      >
        {props.value}
      </p>
    </button>
  )
}

export default function BiometricsOverview(props: { biometrics: FitnessBiometricRow[] }) {
  const { biometrics } = props
  const [energyHistory, setEnergyHistory] = useState<EnergyHistoryEntry[]>([])
  const [todayEnergy, setTodayEnergy] = useState<EnergyHistoryEntry | null>(null)
  const [energyLoading, setEnergyLoading] = useState(true)
  const [scoreReason, setScoreReason] = useState<'stress' | 'energy' | null>(null)

  const { latest, latestGoogle } = useMemo(
    () => pickLatestBiometricsDisplay(biometrics),
    [biometrics]
  )
  const latestMeta = useMemo(() => (latest ? contextualFor(latest) : null), [latest])
  const weekSummary = useMemo(() => summarizeWeeklyGoogleHealth(biometrics, 7), [biometrics])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setEnergyLoading(true)
      try {
        const res = await fetch(`/api/fitness/energy-history?_=${Date.now()}`, {
          cache: 'no-store',
        })
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        setTodayEnergy(data.today ?? data.live ?? null)
        const rows: EnergyHistoryEntry[] = [
          ...(data.today ? [data.today] : data.live ? [data.live] : []),
          ...(data.history ?? []),
        ]
        const seen = new Set<string>()
        setEnergyHistory(
          rows.filter((r) => {
            if (seen.has(r.log_date)) return false
            seen.add(r.log_date)
            return true
          })
        )
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setEnergyLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [biometrics])

  if (!latest) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
        <Activity className="mx-auto mb-3 h-10 w-10 text-gray-400" />
        Connect Google Health or log your biometrics above to see your latest readings, energy
        history, and your adapted routine for today.
      </div>
    )
  }

  const computedEnergy = todayEnergy?.self_energy_level
  const computedStress = todayEnergy?.stress_level
  const score = computedEnergy ?? latestMeta?.score ?? 5
  const mode = energyModeFromScore(score)
  const modeCopy = MODE_COPY[mode]
  const recent = biometrics.slice(0, 14)

  const fmt = (v: number | null | undefined, suffix = '') =>
    typeof v === 'number' ? `${v}${suffix}` : '—'

  const round1 = (v: number | null) => (v === null ? '—' : `${Math.round(v * 10) / 10}`)

  const energyLogRows = energyHistory.slice(0, 14)
  const scoreFactors = todayEnergy ? formatScoreFactors(todayEnergy.adjustments_applied) : []

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Activity className="h-5 w-5 text-amber-600" />
            Latest biometrics
          </h3>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                isGoogleHealthRow(latest)
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {isGoogleHealthRow(latest) ? (
                <Watch className="h-3 w-3" />
              ) : (
                <PencilLine className="h-3 w-3" />
              )}
              {sourceLabel(latest.source)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {new Date(latest.recorded_at).toLocaleString()}
            </span>
          </div>
        </div>

        {latestGoogle && (
          <p className="mb-4 text-xs text-gray-500">
            Wearable metrics from Google Health (
            {new Date(latestGoogle.recorded_at).toLocaleString()}). Stress and self energy are
            computed from sleep, activity, habits, and LifeStacks usage — tap either score for
            details.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Metric
            icon={<Moon className="h-3.5 w-3.5" />}
            label="Sleep"
            value={fmt(latest.sleep_hours, 'h')}
          />
          <Metric
            icon={<Heart className="h-3.5 w-3.5" />}
            label="Resting HR"
            value={fmt(latest.resting_heart_rate, ' bpm')}
          />
          <Metric
            icon={<Footprints className="h-3.5 w-3.5" />}
            label="Steps"
            value={typeof latest.steps === 'number' ? latest.steps.toLocaleString() : '—'}
          />
          <ClickableScoreMetric
            icon={<Zap className="h-3.5 w-3.5" />}
            label="Stress"
            value={fmt(computedStress, '/10')}
            accent="text-orange-900"
            onClick={() => setScoreReason('stress')}
          />
          <ClickableScoreMetric
            icon={<Zap className="h-3.5 w-3.5" />}
            label="Self energy"
            value={fmt(computedEnergy, '/10')}
            accent="text-green-900"
            onClick={() => setScoreReason('energy')}
          />
          <Metric
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Contextual energy"
            value={`${score}/10`}
            accent="text-amber-900"
          />
        </div>
      </div>

      {/* Energy history log */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <TrendingUp className="h-5 w-5 text-emerald-700" />
            Energy history log
          </h3>
          <span className="text-xs text-gray-500">
            Auto-saved daily at 11:59 PM in your timezone
          </span>
        </div>

        {energyLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading energy history…
          </div>
        ) : energyLogRows.length === 0 ? (
          <p className="text-sm text-gray-600">
            No daily snapshots yet. Scores are computed from Google Health data, LifeStacks points,
            habits, and module activity. Your first end-of-day log appears after tonight&apos;s
            11:59 PM snapshot.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-emerald-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Sleep</th>
                  <th className="py-2 pr-3 font-medium">RHR</th>
                  <th className="py-2 pr-3 font-medium">Steps</th>
                  <th className="py-2 pr-3 font-medium">Self energy</th>
                  <th className="py-2 pr-3 font-medium">Stress</th>
                  <th className="py-2 pr-3 font-medium">Factors</th>
                </tr>
              </thead>
              <tbody>
                {energyLogRows.map((row) => (
                  <tr
                    key={row.id + row.log_date}
                    className="border-b border-emerald-100 text-gray-700"
                  >
                    <td className="py-2 pr-3 whitespace-nowrap font-medium">
                      {formatLogDate(row.log_date)}
                    </td>
                    <td className="py-2 pr-3">{fmt(row.sleep_hours, 'h')}</td>
                    <td className="py-2 pr-3">{fmt(row.resting_heart_rate)}</td>
                    <td className="py-2 pr-3">
                      {typeof row.steps === 'number' ? row.steps.toLocaleString() : '—'}
                    </td>
                    <td className="py-2 pr-3 font-medium text-green-900">
                      {row.self_energy_level}/10
                    </td>
                    <td className="py-2 pr-3 font-medium text-orange-900">{row.stress_level}/10</td>
                    <td className="py-2 pr-3 text-xs text-gray-500">
                      {row.adjustments_applied.length > 0
                        ? `${row.adjustments_applied.length} applied`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {todayEnergy && todayEnergy.adjustments_applied.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-medium text-emerald-800">
              Today&apos;s score factors ({todayEnergy.adjustments_applied.length})
            </summary>
            <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs text-gray-600">
              {todayEnergy.adjustments_applied.map((line, i) => (
                <li key={i}>{line.replace(/_/g, ' ')}</li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {weekSummary.days > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Watch className="h-5 w-5 text-blue-600" />
              This week from Google Health
            </h3>
            <span className="text-xs text-gray-500">
              {weekSummary.nightsWithSleep} night{weekSummary.nightsWithSleep === 1 ? '' : 's'} with
              sleep · {weekSummary.days} day{weekSummary.days === 1 ? '' : 's'} synced
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric
              icon={<Moon className="h-3.5 w-3.5" />}
              label="Avg sleep"
              value={weekSummary.avgSleep === null ? '—' : `${round1(weekSummary.avgSleep)}h`}
            />
            <Metric
              icon={<Heart className="h-3.5 w-3.5" />}
              label="Avg resting HR"
              value={weekSummary.avgRhr === null ? '—' : `${Math.round(weekSummary.avgRhr)} bpm`}
            />
            <Metric
              icon={<Footprints className="h-3.5 w-3.5" />}
              label="Total steps"
              value={weekSummary.totalSteps > 0 ? weekSummary.totalSteps.toLocaleString() : '—'}
            />
            <Metric
              icon={<Footprints className="h-3.5 w-3.5" />}
              label="Avg steps/day"
              value={
                weekSummary.avgSteps === null
                  ? '—'
                  : Math.round(weekSummary.avgSteps).toLocaleString()
              }
            />
          </div>
        </div>
      )}

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Zap className="h-5 w-5 text-amber-700" />
          Adapted routine for today
        </h3>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
              mode === 'low'
                ? 'bg-amber-200 text-amber-900'
                : mode === 'high'
                  ? 'bg-green-200 text-green-900'
                  : 'bg-gray-200 text-gray-800'
            }`}
          >
            {modeCopy.label}
          </span>
          <span className="text-sm text-gray-700">
            Based on a contextual energy of <strong>{score}/10</strong>
          </span>
        </div>
        <p className="mt-3 text-sm text-amber-950">{modeCopy.detail}</p>
        {todayEnergy && todayEnergy.adjustments_applied.length > 0 && (
          <ul className="mt-3 list-inside list-disc space-y-0.5 text-xs text-gray-600">
            {todayEnergy.adjustments_applied.slice(0, 5).map((line, i) => (
              <li key={i}>{line.replace(/_/g, ' ')}</li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-gray-500">
          Open any workout plan to see the adjusted sets, reps, and rest applied to your weekly
          routine. Coaching guidance only — not medical advice.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Clock className="h-5 w-5 text-gray-500" />
          Biometrics log history
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-3 font-medium">When</th>
                <th className="py-2 pr-3 font-medium">Source</th>
                <th className="py-2 pr-3 font-medium">Sleep</th>
                <th className="py-2 pr-3 font-medium">RHR</th>
                <th className="py-2 pr-3 font-medium">Steps</th>
                <th className="py-2 pr-3 font-medium">BP</th>
                <th className="py-2 pr-3 font-medium">Energy</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((row) => {
                const ctx = contextualFor(row).score
                return (
                  <tr key={row.id} className="border-b border-gray-100 text-gray-700">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {new Date(row.recorded_at).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          isGoogleHealthRow(row)
                            ? 'bg-blue-100 text-blue-800'
                            : row.source === 'daily_snapshot'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {sourceLabel(row.source)}
                      </span>
                    </td>
                    <td className="py-2 pr-3">{fmt(row.sleep_hours, 'h')}</td>
                    <td className="py-2 pr-3">{fmt(row.resting_heart_rate)}</td>
                    <td className="py-2 pr-3">
                      {typeof row.steps === 'number' ? row.steps.toLocaleString() : '—'}
                    </td>
                    <td className="py-2 pr-3">
                      {typeof row.blood_pressure_systolic === 'number' &&
                      typeof row.blood_pressure_diastolic === 'number'
                        ? `${row.blood_pressure_systolic}/${row.blood_pressure_diastolic}`
                        : '—'}
                    </td>
                    <td className="py-2 pr-3 font-medium text-amber-900">{ctx}/10</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {biometrics.length > recent.length && (
          <p className="mt-3 text-xs text-gray-500">
            Showing the {recent.length} most recent entries.
          </p>
        )}
      </div>

      {scoreReason && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="score-reason-title"
          onClick={() => setScoreReason(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h4 id="score-reason-title" className="text-lg font-semibold text-gray-900">
                  {scoreReason === 'stress' ? 'Stress level' : 'Self energy level'}
                </h4>
                <p className="mt-1 text-2xl font-bold text-amber-900">
                  {scoreReason === 'stress'
                    ? fmt(computedStress, '/10')
                    : fmt(computedEnergy, '/10')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScoreReason(null)}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-3 text-sm text-gray-600">
              Calculated from your Google Health data, LifeStacks points, habits, and module
              activity today. Final scores are clamped between 1 and 10.
            </p>
            {scoreFactors.length > 0 ? (
              <ul className="space-y-2 text-sm text-gray-700">
                {scoreFactors.map((factor, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">
                {energyLoading
                  ? 'Loading score details…'
                  : 'No detailed factors available yet. Sync Google Health or check back after more activity today.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
