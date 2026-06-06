'use client'

import { useMemo } from 'react'
import {
  Activity,
  Footprints,
  Gauge,
  Heart,
  Moon,
  Zap,
  Clock,
  Watch,
  PencilLine,
} from 'lucide-react'
import type { FitnessBiometricRow } from './BiometricsSection'
import { computeContextualEnergyLevel } from '@/lib/fitness/contextual-energy'
import { energyModeFromScore } from '@/lib/fitness/adapt-workout-structure'

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
  if (source === 'manual' || !source) return 'Manual'
  return source
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

export default function BiometricsOverview(props: { biometrics: FitnessBiometricRow[] }) {
  const { biometrics } = props

  const latest = biometrics[0] ?? null
  const latestMeta = useMemo(() => (latest ? contextualFor(latest) : null), [latest])

  if (!latest) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
        <Activity className="mx-auto mb-3 h-10 w-10 text-gray-400" />
        Connect Google Health or log your biometrics above to see your latest readings, a
        timestamped history, and your adapted routine for today.
      </div>
    )
  }

  const score = latestMeta?.score ?? 5
  const mode = energyModeFromScore(score)
  const modeCopy = MODE_COPY[mode]
  const recent = biometrics.slice(0, 14)

  const fmt = (v: number | null | undefined, suffix = '') =>
    typeof v === 'number' ? `${v}${suffix}` : '—'

  // Weekly summary of Google Health data (last 7 days, auto-synced rows only).
  const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000
  const weekRows = biometrics.filter(
    (r) => r.source === 'google_health' && new Date(r.recorded_at).getTime() >= weekStart
  )
  const avg = (vals: number[]) =>
    vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  const sleepVals = weekRows
    .map((r) => r.sleep_hours)
    .filter((v): v is number => typeof v === 'number')
  const rhrVals = weekRows
    .map((r) => r.resting_heart_rate)
    .filter((v): v is number => typeof v === 'number')
  const stepVals = weekRows.map((r) => r.steps).filter((v): v is number => typeof v === 'number')
  const weekSummary = {
    days: weekRows.length,
    avgSleep: avg(sleepVals),
    avgRhr: avg(rhrVals),
    totalSteps: stepVals.reduce((a, b) => a + b, 0),
    avgSteps: avg(stepVals),
  }
  const round1 = (v: number | null) => (v === null ? '—' : `${Math.round(v * 10) / 10}`)

  return (
    <div className="space-y-6">
      {/* Latest reading */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Activity className="h-5 w-5 text-amber-600" />
            Latest biometrics
          </h3>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                latest.source === 'google_health'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {latest.source === 'google_health' ? (
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
          <Metric
            icon={<Gauge className="h-3.5 w-3.5" />}
            label="Blood pressure"
            value={
              typeof latest.blood_pressure_systolic === 'number' &&
              typeof latest.blood_pressure_diastolic === 'number'
                ? `${latest.blood_pressure_systolic}/${latest.blood_pressure_diastolic}`
                : '—'
            }
          />
          <Metric
            icon={<Zap className="h-3.5 w-3.5" />}
            label="Stress"
            value={fmt(latest.stress_level_1_10, '/10')}
          />
          <Metric
            icon={<Zap className="h-3.5 w-3.5" />}
            label="Self energy"
            value={fmt(latest.energy_level_self_1_10, '/10')}
          />
          <Metric
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Contextual energy"
            value={`${score}/10`}
            accent="text-amber-900"
          />
        </div>
      </div>

      {/* This week from Google Health */}
      {weekSummary.days > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Watch className="h-5 w-5 text-blue-600" />
              This week from Google Health
            </h3>
            <span className="text-xs text-gray-500">
              {weekSummary.days} day{weekSummary.days === 1 ? '' : 's'} synced (last 7 days)
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

      {/* Adapted routine for today */}
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
        {latestMeta && latestMeta.rationale.length > 0 && (
          <ul className="mt-3 list-inside list-disc space-y-0.5 text-xs text-gray-600">
            {latestMeta.rationale.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-gray-500">
          Open any workout plan to see the adjusted sets, reps, and rest applied to your weekly
          routine. Coaching guidance only — not medical advice.
        </p>
      </div>

      {/* Timestamped log history */}
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
                          row.source === 'google_health'
                            ? 'bg-blue-100 text-blue-800'
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
    </div>
  )
}
