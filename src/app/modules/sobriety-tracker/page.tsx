'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Award,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle,
  DollarSign,
  Flame,
  Loader2,
  MapPin,
  Shield,
  Sparkles,
  Star,
  Trophy,
  Wine,
} from 'lucide-react'
import { RECOVERY_PRINCIPLES, AA_DISCLAIMER } from '@/lib/sobriety/aa-principles'
import { formatUsd } from '@/lib/sobriety/savings'
import { describeCorrelation } from '@/lib/sobriety/after-drink-biometrics'
import { addDays } from '@/lib/sobriety/streak'
import {
  IAM_PRESENT_HREF,
  FITNESS_STATS_HREF,
  BUDGET_TRANSACTIONS_HREF,
  type AfterDrinkBiometrics,
  type BarCandidate,
  type SobrietyDailyLog,
  type SobrietyDecisionLog,
  type SobrietyInfluencePlace,
  type SobrietyProfile,
  type SobrietyUserBadge,
} from '@/lib/sobriety/types'
import type { SobrietyBadgeDef } from '@/lib/sobriety/badges'
import type { SavingsResult } from '@/lib/sobriety/savings'

const MODULE_ID = 'sobriety-tracker'

type TabId = 'today' | 'log' | 'after' | 'savings' | 'steps' | 'awards' | 'places'

type Overview = {
  profile: SobrietyProfile
  logs: SobrietyDailyLog[]
  decisions: SobrietyDecisionLog[]
  places: SobrietyInfluencePlace[]
  highlightedPlaces: SobrietyInfluencePlace[]
  badges: { catalog: SobrietyBadgeDef[]; earned: SobrietyUserBadge[] }
  streak: number
  soberDays: number
  savings: SavingsResult
  todaysLog: SobrietyDailyLog | null
  afterDrink: AfterDrinkBiometrics[]
  recentRumination: boolean
  pointsPerSoberDay: number
  today: string
}

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'log', label: 'Log' },
  { id: 'after', label: 'After drinking' },
  { id: 'savings', label: 'Savings' },
  { id: 'steps', label: '12 Steps' },
  { id: 'awards', label: 'Awards' },
  { id: 'places', label: 'Places' },
]

const OFFSET_LABELS: Record<0 | 1 | 2, string> = {
  0: 'Day of drinking',
  1: 'Next day',
  2: 'Two days after',
}

function metricBox(label: string, value: string | number, empty = false) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-lg font-semibold ${empty ? 'text-slate-400' : 'text-slate-900'}`}>
        {value}
      </p>
    </div>
  )
}

export default function SobrietyTrackerPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<TabId>('today')
  const [drinkCount, setDrinkCount] = useState(1)
  const [notes, setNotes] = useState('')
  const [cost, setCost] = useState(8)
  const [drinksPerWeek, setDrinksPerWeek] = useState(7)
  const [drinksPerOuting, setDrinksPerOuting] = useState(2)
  const [analyzing, setAnalyzing] = useState(false)
  const [candidates, setCandidates] = useState<BarCandidate[]>([])
  const [placeChoice, setPlaceChoice] = useState<Record<string, 'drank' | 'sober'>>({})
  const [addDatesToLog, setAddDatesToLog] = useState(true)
  const [analysisMeta, setAnalysisMeta] = useState<{ live: number; cached: number } | null>(null)
  const [decisionDrafts, setDecisionDrafts] = useState<
    Record<string, { content: string; rumination: boolean }>
  >({})
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    const response = await fetch('/api/sobriety-tracker')
    if (!response.ok) throw new Error('Failed to load')
    const json = (await response.json()) as Overview
    setData(json)
    setCost(Number(json.profile.typical_drink_cost))
    setDrinksPerWeek(Number(json.profile.typical_drinks_per_week))
    setDrinksPerOuting(Number(json.profile.typical_drinks_per_outing ?? 2))
    if (json.todaysLog?.drank) setDrinkCount(json.todaysLog.drink_count || 1)
    if (json.todaysLog?.notes) setNotes(json.todaysLog.notes)
    const drafts: Record<string, { content: string; rumination: boolean }> = {}
    for (const d of json.decisions) {
      drafts[`${d.drink_date}:${d.day_offset}`] = {
        content: d.content,
        rumination: d.has_rumination,
      }
    }
    setDecisionDrafts(drafts)
  }, [])

  useEffect(() => {
    void fetch('/api/modules/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleId: MODULE_ID }),
    })
    load()
      .catch((error) => console.error(error))
      .finally(() => setLoading(false))
  }, [load])

  const flash = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 3500)
  }

  const submitDay = async (drank: boolean) => {
    setSaving(true)
    try {
      const response = await fetch('/api/sobriety-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drank,
          drink_count: drank ? drinkCount : 0,
          notes: notes.trim() || null,
        }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'Save failed')
      await load()
      if (!drank && json.pointsAwarded) {
        flash(`Logged a sober day. +${json.pointsAwarded} points.`)
      } else if (drank) {
        flash('Drinking day saved. Honesty is part of recovery.')
        setTab('log')
      }
      if (json.newBadges?.length) flash(`New badge${json.newBadges.length > 1 ? 's' : ''} earned.`)
    } catch (error) {
      flash(error instanceof Error ? error.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const saveProfile = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/sobriety-tracker/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typical_drink_cost: cost,
          typical_drinks_per_week: drinksPerWeek,
          typical_drinks_per_outing: drinksPerOuting,
          typical_drink_label: data?.profile.typical_drink_label || 'drink',
          sobriety_start_date: data?.profile.sobriety_start_date,
        }),
      })
      if (!response.ok) throw new Error('Could not save calculator')
      await load()
      flash('Savings settings saved.')
    } catch (error) {
      flash(error instanceof Error ? error.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const saveDecision = async (drinkDate: string, dayOffset: 0 | 1 | 2) => {
    const key = `${drinkDate}:${dayOffset}`
    const draft = decisionDrafts[key] || { content: '', rumination: false }
    setSaving(true)
    try {
      const response = await fetch('/api/sobriety-tracker/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drink_date: drinkDate,
          day_offset: dayOffset,
          content: draft.content,
          has_rumination: draft.rumination,
        }),
      })
      if (!response.ok) throw new Error('Could not save decision')
      await load()
      flash(
        draft.rumination
          ? 'Saved. I Am Present is ready if you want to ground.'
          : 'Decision note saved.'
      )
    } catch (error) {
      flash(error instanceof Error ? error.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const runAnalysis = async () => {
    setAnalyzing(true)
    try {
      const response = await fetch('/api/sobriety-tracker/analyze-places', { method: 'POST' })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'Analysis failed')
      setCandidates(json.candidates || [])
      setAnalysisMeta({
        live: json.liveTransactionCount || 0,
        cached: json.cachedMerchantCount || 0,
      })
      const preselect: Record<string, 'drank' | 'sober'> = {}
      for (const c of json.candidates || []) {
        preselect[c.merchant_name] = c.category === 'bar' ? 'drank' : 'sober'
      }
      setPlaceChoice(preselect)
      if (!(json.candidates || []).length)
        flash('No likely bars or restaurants found in Budget Master.')
    } catch (error) {
      flash(error instanceof Error ? error.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const confirmPlaces = async () => {
    const chosen = candidates.filter((c) => placeChoice[c.merchant_name])
    if (!chosen.length) return
    setSaving(true)
    try {
      const response = await fetch('/api/sobriety-tracker/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          places: chosen.map((c) => {
            const soberOuting = placeChoice[c.merchant_name] === 'sober'
            return {
              merchant_name: c.merchant_name,
              category: c.category,
              visit_count: c.visit_count,
              total_spend: c.total_spend,
              last_seen_date: c.last_seen_date,
              sample_dates: c.sample_dates,
              transaction_ids: c.transaction_ids,
              add_dates_to_log: addDatesToLog && !soberOuting,
              counts_as_sober_outing: soberOuting,
            }
          }),
        }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'Could not save places')
      await load()
      const soberCount = chosen.filter((c) => placeChoice[c.merchant_name] === 'sober').length
      flash(
        addDatesToLog && json.addedLogDates?.length
          ? `Saved places and added ${json.addedLogDates.length} drinking day(s) to your log.`
          : soberCount
            ? `Saved places. ${soberCount} restaurant visit group(s) count toward drink savings.`
            : 'Influence places saved to the front of the app.'
      )
      setTab('savings')
    } catch (error) {
      flash(error instanceof Error ? error.message : 'Could not save places')
    } finally {
      setSaving(false)
    }
  }

  const toggleHighlight = async (place: SobrietyInfluencePlace) => {
    try {
      const response = await fetch('/api/sobriety-tracker/places', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: place.id, highlighted: !place.highlighted }),
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(json.error || 'Could not update highlight')
      }
      await load()
    } catch (error) {
      flash(error instanceof Error ? error.message : 'Could not update highlight')
    }
  }

  const toggleSoberOuting = async (place: SobrietyInfluencePlace) => {
    try {
      const response = await fetch('/api/sobriety-tracker/places', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: place.id,
          counts_as_sober_outing: !place.counts_as_sober_outing,
        }),
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(json.error || 'Could not update savings selection')
      }
      await load()
    } catch (error) {
      flash(error instanceof Error ? error.message : 'Could not update savings selection')
    }
  }

  const drinkDays = useMemo(() => (data?.logs || []).filter((l) => l.drank), [data])

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-700 mx-auto mb-3" />
          <p className="text-slate-600">Loading Sobriety Tracker...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-6">
        <p className="text-slate-600">Could not load Sobriety Tracker.</p>
      </div>
    )
  }

  const earnedIds = new Set(data.badges.earned.map((b) => b.badge_id))
  const showRumination =
    data.recentRumination || drinkDays.some((l) => l.log_date >= addDays(data.today, -2))

  return (
    <div className="sobriety-tracker-module min-h-screen bg-gradient-to-b from-emerald-50 via-teal-50 to-slate-50">
      <div className="bg-white border-b border-emerald-100">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <Link href="/modules">
              <button className="inline-flex items-center gap-2 text-sm font-medium h-9 rounded-md px-3 hover:bg-emerald-50">
                <ArrowLeft className="h-4 w-4" />
                Back to Stacks
              </button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                <Shield className="h-8 w-8 text-emerald-700" />
                Sobriety Tracker
              </h1>
              <p className="text-sm text-slate-600">
                Honest logging, recovery principles, and the money and energy you get back
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
        {toast && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {toast}
          </div>
        )}

        {data.highlightedPlaces.length > 0 && (
          <section className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <MapPin className="h-6 w-6 text-amber-700 mt-0.5" />
              <div className="flex-1">
                <h2 className="font-semibold text-amber-950">Places that may influence drinking</h2>
                <p className="text-sm text-amber-900 mb-3">
                  Keep these in view. They came from your Budget Master transactions and your
                  confirmation.
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.highlightedPlaces.map((place) => (
                    <span
                      key={place.id}
                      className="inline-flex items-center gap-2 rounded-full bg-white border border-amber-300 px-3 py-1 text-sm text-amber-950"
                    >
                      <Wine className="h-3.5 w-3.5" />
                      {place.merchant_name}
                      <span className="text-xs text-amber-700">{place.category}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {showRumination && (
          <section className="rounded-xl border border-sky-200 bg-sky-50 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <Sparkles className="h-6 w-6 text-sky-700 mt-0.5" />
                <div>
                  <h2 className="font-semibold text-sky-950">Ruminating after drinking?</h2>
                  <p className="text-sm text-sky-900">
                    I Am Present is built for looping thoughts, shame, and getting back to now.
                  </p>
                </div>
              </div>
              <Link
                href={IAM_PRESENT_HREF}
                className="inline-flex items-center justify-center rounded-md bg-sky-700 text-white px-4 py-2 text-sm font-medium hover:bg-sky-800"
              >
                Open I Am Present
              </Link>
            </div>
          </section>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <Flame className="h-6 w-6 text-emerald-600 mx-auto mb-1" />
            <p className="text-2xl font-bold">{data.streak}</p>
            <p className="text-xs text-slate-500">Sober streak</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <Calendar className="h-6 w-6 text-emerald-600 mx-auto mb-1" />
            <p className="text-2xl font-bold">{data.soberDays}</p>
            <p className="text-xs text-slate-500">Sober days logged</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <Star className="h-6 w-6 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{data.soberDays * data.pointsPerSoberDay}</p>
            <p className="text-xs text-slate-500">Points from sober days</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <DollarSign className="h-6 w-6 text-emerald-600 mx-auto mb-1" />
            <p className="text-2xl font-bold">{formatUsd(data.savings.savedToDate)}</p>
            <p className="text-xs text-slate-500">Estimated saved</p>
            {data.savings.fromRestaurantVisits > 0 && (
              <p className="text-[11px] text-emerald-800 mt-1">
                Includes {formatUsd(data.savings.fromRestaurantVisits)} from sober restaurant visits
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <div className="flex min-w-max">
            {TABS.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 ${
                  tab === item.id
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'today' && (
          <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <h2 className="text-xl font-semibold text-slate-900">Today&apos;s check-in</h2>
            <p className="text-sm text-slate-600">
              Each sober day automatically adds {data.pointsPerSoberDay} points to your daily
              points. If you drank, log it honestly — that unlocks after-effects, decision notes,
              and the Honesty badge.
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional note about today"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              rows={3}
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                disabled={saving}
                onClick={() => submitDay(false)}
                className="flex-1 rounded-lg bg-emerald-700 text-white py-3 font-medium hover:bg-emerald-800 disabled:opacity-60"
              >
                I did not drink
              </button>
              <div className="flex-1 flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={drinkCount}
                  onChange={(e) => setDrinkCount(Math.max(1, Number(e.target.value) || 1))}
                  className="w-20 rounded-lg border border-slate-300 px-2 text-center"
                  aria-label="Drink count"
                />
                <button
                  disabled={saving}
                  onClick={() => submitDay(true)}
                  className="flex-1 rounded-lg border border-slate-300 py-3 font-medium hover:bg-slate-50 disabled:opacity-60"
                >
                  I drank this many
                </button>
              </div>
            </div>
            {data.todaysLog && (
              <p className="text-sm text-slate-500">
                Today is logged as{' '}
                {data.todaysLog.drank ? `${data.todaysLog.drink_count} drink(s)` : 'sober'}
                {data.todaysLog.points_awarded
                  ? ` · ${data.todaysLog.points_awarded} points awarded`
                  : ''}
                .
              </p>
            )}
          </section>
        )}

        {tab === 'log' && (
          <section className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-xl font-semibold mb-2">Drinking days and decisions</h2>
              <p className="text-sm text-slate-600 mb-4">
                For each drinking day, write the decisions you made that day and on the next two
                days. If thoughts start looping, mark rumination and open I Am Present.
              </p>
              {drinkDays.length === 0 ? (
                <p className="text-sm text-slate-500">No drinking days logged yet.</p>
              ) : (
                <div className="space-y-6">
                  {drinkDays.slice(0, 12).map((log) => (
                    <div key={log.id} className="rounded-lg border border-slate-200 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">
                          {log.log_date} · {log.drink_count} drink{log.drink_count === 1 ? '' : 's'}
                        </p>
                        {log.source === 'budget_place' && (
                          <span className="text-xs rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">
                            From Budget Master
                          </span>
                        )}
                      </div>
                      {([0, 1, 2] as const).map((offset) => {
                        const key = `${log.log_date}:${offset}`
                        const draft = decisionDrafts[key] || { content: '', rumination: false }
                        return (
                          <div key={key} className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">
                              {OFFSET_LABELS[offset]} ({addDays(log.log_date, offset)})
                            </label>
                            <textarea
                              value={draft.content}
                              onChange={(e) =>
                                setDecisionDrafts((prev) => ({
                                  ...prev,
                                  [key]: { ...draft, content: e.target.value },
                                }))
                              }
                              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                              rows={2}
                              placeholder="What did you decide, avoid, or justify?"
                            />
                            <div className="flex items-center justify-between gap-3">
                              <label className="flex items-center gap-2 text-sm text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={draft.rumination}
                                  onChange={(e) =>
                                    setDecisionDrafts((prev) => ({
                                      ...prev,
                                      [key]: { ...draft, rumination: e.target.checked },
                                    }))
                                  }
                                />
                                I am ruminating
                              </label>
                              <div className="flex items-center gap-2">
                                {draft.rumination && (
                                  <Link
                                    href={IAM_PRESENT_HREF}
                                    className="text-sm text-sky-700 underline"
                                  >
                                    I Am Present
                                  </Link>
                                )}
                                <button
                                  disabled={saving || !draft.content.trim()}
                                  onClick={() => saveDecision(log.log_date, offset)}
                                  className="rounded-md bg-emerald-700 text-white px-3 py-1.5 text-sm disabled:opacity-50"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold mb-3">Recent days</h3>
              <div className="space-y-2">
                {data.logs.slice(0, 21).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between text-sm border-b border-slate-100 py-2"
                  >
                    <span>{log.log_date}</span>
                    <span className={log.drank ? 'text-amber-800' : 'text-emerald-700'}>
                      {log.drank
                        ? `${log.drink_count} drink(s)`
                        : `Sober · +${log.points_awarded || data.pointsPerSoberDay} pts`}
                    </span>
                  </div>
                ))}
                {data.logs.length === 0 && (
                  <p className="text-sm text-slate-500">No days logged yet.</p>
                )}
              </div>
            </div>
          </section>
        )}

        {tab === 'after' && (
          <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-xl font-semibold">Fitness Stats after drinking</h2>
            <p className="text-sm text-slate-600">
              This reads stress and contextual energy from Fitness Tracker&apos;s Stats tab for the
              first and second day after each drinking log. Numbers are shown as recorded — no
              verdict is forced. A dip after drinking is common; let the data speak.
            </p>
            <Link href={FITNESS_STATS_HREF} className="text-sm text-emerald-800 underline">
              Open Fitness Tracker Stats
            </Link>
            {data.afterDrink.length === 0 ? (
              <p className="text-sm text-slate-500">
                Log a drinking day to compare the next two days of biometrics.
              </p>
            ) : (
              data.afterDrink.map((row) => {
                const note = describeCorrelation(row)
                return (
                  <div
                    key={row.drinkDate}
                    className="rounded-lg border border-slate-200 p-4 space-y-3"
                  >
                    <p className="font-medium">
                      Drank {row.drinkCount} on {row.drinkDate}
                    </p>
                    <div className="grid md:grid-cols-2 gap-3">
                      {[row.day1, row.day2].map((day, idx) => (
                        <div key={day.date} className="space-y-2">
                          <p className="text-sm font-medium text-slate-700">
                            Day {idx + 1} after · {day.date}
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {metricBox(
                              'Stress /10',
                              day.stress_level ?? '—',
                              day.stress_level == null
                            )}
                            {metricBox(
                              'Contextual energy /10',
                              day.contextual_energy ?? '—',
                              day.contextual_energy == null
                            )}
                          </div>
                          {day.source === 'none' && (
                            <p className="text-xs text-slate-500">
                              No Stats data for this day yet.
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                    {note && (
                      <p className="text-sm text-slate-700 bg-slate-50 rounded-md p-3">{note}</p>
                    )}
                  </div>
                )
              })
            )}
          </section>
        )}

        {tab === 'savings' && (
          <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-xl font-semibold">Money kept by not drinking</h2>
            <p className="text-sm text-slate-600">
              Baseline savings uses typical drink cost × weekly drinks × sober days. Restaurant
              savings uses restaurants you visited but did not drink at, times drinks you would
              usually order there.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <label className="text-sm">
                Typical cost per drink
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={cost}
                  onChange={(e) => setCost(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                Typical drinks per week
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={drinksPerWeek}
                  onChange={(e) => setDrinksPerWeek(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                Average drinks per restaurant visit
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={drinksPerOuting}
                  onChange={(e) => setDrinksPerOuting(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
            </div>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="rounded-md bg-emerald-700 text-white px-4 py-2 text-sm disabled:opacity-50"
            >
              Save as my baseline
            </button>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
              {metricBox('Per day', formatUsd(data.savings.dailyCost))}
              {metricBox('Per week', formatUsd(data.savings.weeklyCost))}
              {metricBox('From sober days', formatUsd(data.savings.fromSoberDays))}
              {metricBox('From restaurants', formatUsd(data.savings.fromRestaurantVisits))}
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-950">Total estimated saved</p>
              <p className="text-2xl font-bold text-emerald-900">
                {formatUsd(data.savings.savedToDate)}
              </p>
              <p className="text-sm text-emerald-900 mt-2">
                {data.savings.restaurant.visitCount} restaurant visit
                {data.savings.restaurant.visitCount === 1 ? '' : 's'} selected ×{' '}
                {data.savings.restaurant.drinksPerOuting} drink
                {data.savings.restaurant.drinksPerOuting === 1 ? '' : 's'} each ={' '}
                {data.savings.restaurant.drinksAvoided} drinks not bought (
                {formatUsd(data.savings.fromRestaurantVisits)}).
              </p>
            </div>
            {data.places.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">Count these restaurant visits as drinks skipped</h3>
                <p className="text-sm text-slate-600">
                  Select places you went to but did not drink at. Unselected places do not add to
                  restaurant savings.
                </p>
                {data.places.map((place) => (
                  <label
                    key={place.id}
                    className="flex items-start gap-3 rounded-lg border border-slate-200 p-3"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={Boolean(place.counts_as_sober_outing)}
                      onChange={() => void toggleSoberOuting(place)}
                    />
                    <div>
                      <p className="font-medium">
                        {place.merchant_name}{' '}
                        <span className="text-xs uppercase text-slate-500">{place.category}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {place.visit_count} visit{place.visit_count === 1 ? '' : 's'}
                        {place.counts_as_sober_outing
                          ? ` · ${formatUsd(place.visit_count * drinksPerOuting * cost)} estimated skipped drinks`
                          : ''}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-500">
              Analyze restaurants in the Places tab, then mark the ones you visited without
              drinking.
            </p>
          </section>
        )}

        {tab === 'steps' && (
          <section className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-emerald-700" />
                Twelve recovery principles
              </h2>
              <p className="text-sm text-slate-600 mt-2">{AA_DISCLAIMER}</p>
            </div>
            {RECOVERY_PRINCIPLES.map((step) => (
              <article
                key={step.number}
                className="bg-white rounded-xl border border-slate-200 p-5"
              >
                <h3 className="font-semibold text-slate-900">
                  {step.number}. {step.title}
                </h3>
                <p className="text-sm text-slate-700 mt-2">{step.summary}</p>
                <p className="text-sm text-emerald-800 mt-2">
                  <span className="font-medium">Practice: </span>
                  {step.practice}
                </p>
              </article>
            ))}
          </section>
        )}

        {tab === 'awards' && (
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <Trophy className="h-5 w-5 text-amber-500" />
              Badges
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {data.badges.catalog.map((badge) => {
                const earned = earnedIds.has(badge.id)
                const earnedAt = data.badges.earned.find((b) => b.badge_id === badge.id)?.earned_at
                return (
                  <div
                    key={badge.id}
                    className={`rounded-lg border p-4 ${
                      earned
                        ? 'border-amber-300 bg-amber-50'
                        : 'border-slate-200 bg-slate-50 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {earned ? (
                        <Award className="h-5 w-5 text-amber-600" />
                      ) : (
                        <Shield className="h-5 w-5 text-slate-400" />
                      )}
                      <p className="font-medium">{badge.name}</p>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{badge.description}</p>
                    {earnedAt && (
                      <p className="text-xs text-amber-800 mt-2">
                        Earned {new Date(earnedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {tab === 'places' && (
          <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Brain className="h-5 w-5 text-emerald-700" />
              Budget Master place analysis
            </h2>
            <p className="text-sm text-slate-600">
              Scans live Budget Master transactions for bars and restaurants. Mark places you drank
              at, or restaurants you visited without drinking so those visits count toward savings.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={runAnalysis}
                disabled={analyzing}
                className="rounded-md bg-emerald-700 text-white px-4 py-2 text-sm disabled:opacity-50 inline-flex items-center gap-2"
              >
                {analyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                Analyze Budget Master
              </button>
              <Link
                href={BUDGET_TRANSACTIONS_HREF}
                className="text-sm text-emerald-800 underline self-center"
              >
                Open Transactions
              </Link>
            </div>
            {analysisMeta && (
              <p className="text-xs text-slate-500">
                Scanned {analysisMeta.live} live transactions and {analysisMeta.cached} cached
                merchant rows.
              </p>
            )}
            {candidates.length > 0 && (
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={addDatesToLog}
                    onChange={(e) => setAddDatesToLog(e.target.checked)}
                  />
                  Add “drank here” visit dates to my drinking log
                </label>
                {candidates.map((c) => (
                  <div
                    key={c.merchant_name}
                    className="rounded-lg border border-slate-200 p-3 space-y-2"
                  >
                    <div>
                      <p className="font-medium">
                        {c.merchant_name}{' '}
                        <span className="text-xs uppercase text-slate-500">{c.category}</span>
                      </p>
                      <p className="text-sm text-slate-600">{c.reason}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {c.visit_count} visit(s) · {formatUsd(c.total_spend)} · {c.source} ·{' '}
                        {c.confidence} confidence
                      </p>
                    </div>
                    <fieldset className="flex flex-wrap gap-3 text-sm">
                      <legend className="sr-only">How to count {c.merchant_name}</legend>
                      {(
                        [
                          ['skip', 'Skip'],
                          ['drank', 'Drank here'],
                          ['sober', 'Visited, did not drink'],
                        ] as const
                      ).map(([value, label]) => (
                        <label key={value} className="inline-flex items-center gap-1.5">
                          <input
                            type="radio"
                            name={`place-${c.merchant_name}`}
                            checked={
                              value === 'skip'
                                ? !placeChoice[c.merchant_name]
                                : placeChoice[c.merchant_name] === value
                            }
                            onChange={() =>
                              setPlaceChoice((prev) => {
                                const next = { ...prev }
                                if (value === 'skip') delete next[c.merchant_name]
                                else next[c.merchant_name] = value
                                return next
                              })
                            }
                          />
                          {label}
                        </label>
                      ))}
                    </fieldset>
                  </div>
                ))}
                <button
                  onClick={confirmPlaces}
                  disabled={saving || !Object.keys(placeChoice).length}
                  className="rounded-md bg-amber-600 text-white px-4 py-2 text-sm disabled:opacity-50"
                >
                  Save selected places
                </button>
              </div>
            )}
            {data.places.length > 0 && (
              <div className="pt-4 border-t border-slate-200 space-y-2">
                <h3 className="font-medium">Saved influence places</h3>
                {data.places.map((place) => (
                  <div
                    key={place.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm py-2"
                  >
                    <span>
                      {place.merchant_name}{' '}
                      <span className="text-xs uppercase text-slate-500">{place.category}</span>{' '}
                      {place.highlighted && (
                        <CheckCircle className="inline h-3.5 w-3.5 text-amber-600" />
                      )}
                      {place.counts_as_sober_outing && (
                        <span className="ml-1 text-xs text-emerald-800">· skipped drinks</span>
                      )}
                    </span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => void toggleSoberOuting(place)}
                        className="text-emerald-800 underline"
                      >
                        {place.counts_as_sober_outing
                          ? 'Do not count for savings'
                          : 'Count as drinks skipped'}
                      </button>
                      <button
                        onClick={() => void toggleHighlight(place)}
                        className="text-emerald-800 underline"
                      >
                        {place.highlighted ? 'Remove highlight' : 'Highlight'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <p className="text-xs text-slate-500 pb-8">
          Sobriety Tracker is a self-tracking tool, not medical care. If you are in crisis, contact
          local emergency services or the IASP resources at iasp.info.
        </p>
      </div>
    </div>
  )
}
