'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Loader2,
  Link as LinkIcon,
  Plus,
  Repeat,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  createDefaultWindow,
  findUnmatchedWindowItems,
  matchesTimeWindow,
  normalizePreferences,
  type CalendarPreferences,
  type CalendarTimeWindow,
  type DayKey,
} from '@/lib/calendar/preferences'

type Recommendation = {
  id: string
  source_type: 'task' | 'habit'
  title: string
  description: string
  weekday: string
  start_time: string
  duration_minutes: number
  recurrence: 'none' | 'daily' | 'weekly'
  selected?: boolean
  added?: boolean
}

type CalendarStatus = {
  configured: boolean
  connected: boolean
  status: 'connected' | 'needs_reauth' | null
  connected_email: string | null
  oauth?: {
    redirect_uri: string
    client_id_suffix: string | null
    uses_explicit_redirect_env: boolean
  } | null
}

type Preferences = CalendarPreferences

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
]
const DAY_INDEX: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }

function hourLabel(h: number): string {
  if (h === 0 || h === 24) return '12:00 AM'
  if (h === 12) return '12:00 PM'
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toLocalIso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:00`
}

function nextOccurrence(weekday: string, startTime: string): Date {
  const [hh, mm] = startTime.split(':').map((x) => parseInt(x, 10))
  const target = DAY_INDEX[weekday] ?? 1
  const now = new Date()
  const d = new Date(now)
  d.setHours(hh || 0, mm || 0, 0, 0)
  let diff = (target - d.getDay() + 7) % 7
  if (diff === 0 && d.getTime() <= now.getTime()) diff = 7
  d.setDate(d.getDate() + diff)
  return d
}

export default function LifestacksCalendarPage() {
  const [status, setStatus] = useState<CalendarStatus | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState('')
  const [connectMessage, setConnectMessage] = useState('')

  const [prefs, setPrefs] = useState<Preferences>(() => normalizePreferences(null))
  const [savingPrefs, setSavingPrefs] = useState(false)

  const [recs, setRecs] = useState<Recommendation[]>([])
  const [generating, setGenerating] = useState(false)
  const [recsMessage, setRecsMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/calendar/status')
      if (res.ok) setStatus(await res.json())
    } catch {
      /* non-fatal */
    }
  }, [])

  const loadPrefs = useCallback(async () => {
    try {
      const res = await fetch('/api/calendar/preferences')
      if (res.ok) {
        const data = await res.json()
        if (data.preferences) setPrefs(normalizePreferences(data.preferences))
      }
    } catch {
      /* non-fatal */
    }
  }, [])

  useEffect(() => {
    void loadStatus()
    void loadPrefs()
  }, [loadStatus, loadPrefs])

  // Handle redirect back from OAuth.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const flag = params.get('calendar')
    if (!flag) return
    if (flag === 'connected') {
      setConnectMessage('Google Calendar connected.')
      void loadStatus()
    } else if (flag === 'error') {
      const reason = params.get('reason') || 'unknown'
      setConnectError(
        reason === 'redirect_uri_mismatch' || reason === 'invalid_request'
          ? `Google OAuth failed (${reason}). Add the redirect URI shown below to your Google Cloud OAuth client, then try again.`
          : `Couldn't connect Google Calendar (${reason}).`
      )
    }
    params.delete('calendar')
    params.delete('reason')
    const cleaned = params.toString()
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${cleaned ? `?${cleaned}` : ''}`
    )
  }, [loadStatus])

  const handleConnect = async () => {
    setConnecting(true)
    setConnectError('')
    try {
      const res = await fetch('/api/calendar/connect')
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.auth_url) {
        setConnectError(json?.error || 'Could not start Google Calendar connection.')
        setConnecting(false)
        return
      }
      window.location.href = json.auth_url
    } catch {
      setConnectError('Could not start Google Calendar connection.')
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Google Calendar?')) return
    await fetch('/api/calendar/disconnect', { method: 'POST' })
    setConnectMessage('')
    await loadStatus()
  }

  const updateWindow = (windowId: string, patch: Partial<CalendarTimeWindow>) => {
    setPrefs((p) => ({
      ...p,
      windows: p.windows.map((w) => (w.id === windowId ? { ...w, ...patch } : w)),
    }))
  }

  const addWindow = () => {
    setPrefs((p) => ({
      ...p,
      windows: [...p.windows, createDefaultWindow()],
    }))
  }

  const removeWindow = (windowId: string) => {
    setPrefs((p) => {
      if (p.windows.length <= 1) return p
      return { ...p, windows: p.windows.filter((w) => w.id !== windowId) }
    })
  }

  const toggleDay = (windowId: string, key: DayKey) => {
    setPrefs((p) => ({
      ...p,
      windows: p.windows.map((w) => {
        if (w.id !== windowId) return w
        const selected = w.days.includes(key)
        const days = selected ? w.days.filter((d) => d !== key) : [...w.days, key]
        return { ...w, days: days.length ? days : w.days }
      }),
    }))
  }

  const savePrefs = async () => {
    setSavingPrefs(true)
    try {
      const res = await fetch('/api/calendar/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ windows: prefs.windows }),
      })
      const data = await res.json()
      if (res.ok && data.preferences) setPrefs(normalizePreferences(data.preferences))
    } finally {
      setSavingPrefs(false)
    }
  }

  const generate = async () => {
    setGenerating(true)
    setRecsMessage('')
    try {
      const res = await fetch('/api/calendar/recommendations', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setRecsMessage(data.error || 'Failed to generate recommendations.')
        return
      }
      const list: Recommendation[] = (data.recommendations || []).map((r: Recommendation) => ({
        ...r,
        selected: true,
        added: false,
      }))
      setRecs(list)
      if (list.length === 0) setRecsMessage(data.message || 'No recommendations were generated.')
    } catch {
      setRecsMessage('Failed to generate recommendations.')
    } finally {
      setGenerating(false)
    }
  }

  const updateRec = (id: string, patch: Partial<Recommendation>) => {
    setRecs((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const addSelected = async () => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'
    const selected = recs.filter((r) => r.selected && !r.added)
    if (selected.length === 0) return
    setAdding(true)
    setRecsMessage('')
    let addedCount = 0
    try {
      for (const rec of selected) {
        const start = nextOccurrence(rec.weekday, rec.start_time)
        const end = new Date(start.getTime() + rec.duration_minutes * 60_000)
        const res = await fetch('/api/calendar/add-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            summary: rec.title,
            description: rec.description,
            startDateTime: toLocalIso(start),
            endDateTime: toLocalIso(end),
            timeZone,
            recurrence: rec.recurrence,
          }),
        })
        if (res.ok) {
          updateRec(rec.id, { added: true, selected: false })
          addedCount++
        } else {
          const j = await res.json().catch(() => ({}))
          setRecsMessage(j.error || 'Some events could not be added.')
          if (j.needsReauth) await loadStatus()
        }
      }
      if (addedCount > 0) {
        setRecsMessage(
          `${addedCount} item${addedCount === 1 ? '' : 's'} added to Google Calendar — listed in the matching time window${addedCount === 1 ? '' : 's'} above.`
        )
      }
    } finally {
      setAdding(false)
    }
  }

  const addedRecs = recs.filter((r) => r.added)
  const addedForWindow = (window: CalendarTimeWindow) =>
    addedRecs.filter((r) => matchesTimeWindow(r.weekday, r.start_time, window))
  const unmatchedAdded = findUnmatchedWindowItems(addedRecs, prefs.windows)

  const renderAddedItem = (rec: Recommendation) => (
    <li
      key={rec.id}
      className="flex items-start gap-2 rounded-md bg-white/70 border border-green-100 px-3 py-2"
    >
      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-gray-900 text-sm">{rec.title}</span>
          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">
            {rec.source_type}
          </span>
          {rec.recurrence !== 'none' && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
              <Repeat className="h-3 w-3" />
              {rec.recurrence}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-600 mt-0.5">
          {DAYS.find((d) => d.key === rec.weekday)?.label} · {rec.start_time} ·{' '}
          {rec.duration_minutes} min
        </p>
      </div>
    </li>
  )

  const selectedCount = recs.filter((r) => r.selected && !r.added).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <Link href="/modules">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Life Hacks
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Calendar className="h-8 w-8 mr-3 text-blue-600" />
                Lifestacks Calendar
              </h1>
              <p className="text-sm text-gray-600">
                Let Lifestacks recommend tasks and habits to schedule into your Google Calendar.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-3xl space-y-6">
        {/* Connection */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Google Calendar</h2>
          {status === null ? (
            <p className="text-sm text-gray-500 inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking calendar connection…
            </p>
          ) : status.configured === false ? (
            <div className="space-y-3 text-sm text-gray-700">
              <p className="text-amber-700 font-medium">
                Google Calendar isn&apos;t configured on the server yet.
              </p>
              <p>
                Yes — you need a Google Cloud OAuth client. Add these to{' '}
                <code className="text-xs bg-gray-100 px-1 rounded">.env.local</code>, restart the
                dev server, then try again:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>
                  <code className="text-xs">GOOGLE_CLIENT_ID</code> and{' '}
                  <code className="text-xs">GOOGLE_CLIENT_SECRET</code> (or{' '}
                  <code className="text-xs">GOOGLE_CALENDAR_*</code> equivalents)
                </li>
                <li>
                  <code className="text-xs">NEXT_PUBLIC_SITE_URL</code> — e.g.{' '}
                  <code className="text-xs">http://localhost:3000</code>
                </li>
                <li>
                  In Google Cloud: enable <strong>Google Calendar API</strong>, configure OAuth
                  consent screen, and add redirect URI{' '}
                  <code className="text-xs break-all">
                    {typeof window !== 'undefined'
                      ? window.location.origin
                      : 'http://localhost:3000'}
                    /api/calendar/callback
                  </code>
                </li>
                <li>
                  Run Supabase migration{' '}
                  <code className="text-xs">065_create_calendar_integration.sql</code>
                </li>
              </ul>
            </div>
          ) : status.connected ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Connected
              </span>
              {status.connected_email && (
                <span className="text-xs text-gray-500">{status.connected_email}</span>
              )}
              <button
                onClick={handleDisconnect}
                className="text-sm text-gray-500 hover:text-red-600 ml-auto"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {status.status === 'needs_reauth' && (
                <p className="inline-flex items-center gap-1.5 text-sm text-amber-700">
                  <AlertTriangle className="h-4 w-4" /> Reconnect needed
                </p>
              )}
              <p className="text-sm text-gray-600">
                Sign in with Google and authorize Lifestacks to add events to your calendar.
              </p>
              {status.oauth?.redirect_uri && (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-950 space-y-2">
                  <p className="font-medium">
                    If Google shows redirect_uri_mismatch, register this exact URI:
                  </p>
                  <code className="block break-all bg-white/80 px-2 py-1 rounded border border-amber-100">
                    {status.oauth.redirect_uri}
                  </code>
                  {status.oauth.client_id_suffix && (
                    <p className="text-amber-900">
                      OAuth client ID ends with:{' '}
                      <code className="bg-white/80 px-1 rounded">
                        {status.oauth.client_id_suffix}
                      </code>{' '}
                      (must match the client in Google Cloud → Credentials)
                    </p>
                  )}
                  {(() => {
                    const uri = status.oauth!.redirect_uri
                    const alt = uri.includes('://www.')
                      ? uri.replace('://www.', '://')
                      : uri.replace('://', '://www.')
                    if (alt === uri) return null
                    return (
                      <p className="text-amber-900">
                        If you use www, also add:{' '}
                        <code className="bg-white/80 px-1 rounded break-all">{alt}</code>
                      </p>
                    )
                  })()}
                </div>
              )}
              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {connecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <LinkIcon className="h-4 w-4 mr-2" />
                )}
                Connect Google Calendar
              </Button>
            </div>
          )}
          {connectMessage && <p className="mt-3 text-sm text-green-700">{connectMessage}</p>}
          {connectError && <p className="mt-3 text-sm text-red-600">{connectError}</p>}
        </div>

        {/* Scheduling window */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            When can Lifestacks schedule items?
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Add one or more windows with allowed times and days. The AI will only schedule inside
            these windows.
          </p>
          <div className="space-y-4 mb-4">
            {prefs.windows.map((window, index) => (
              <div
                key={window.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">Window {index + 1}</h3>
                  {prefs.windows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeWindow(window.id)}
                      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">Earliest time</span>
                    <select
                      value={window.start_hour}
                      onChange={(e) =>
                        updateWindow(window.id, { start_hour: parseInt(e.target.value, 10) })
                      }
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      {Array.from({ length: 20 }, (_, i) => i + 5).map((h) => (
                        <option key={h} value={h}>
                          {hourLabel(h)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">Latest time</span>
                    <select
                      value={window.end_hour}
                      onChange={(e) =>
                        updateWindow(window.id, { end_hour: parseInt(e.target.value, 10) })
                      }
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      {Array.from({ length: 20 }, (_, i) => i + 5).map((h) => (
                        <option key={h} value={h}>
                          {hourLabel(h)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 block mb-2">Days</span>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((d) => {
                      const selected = window.days.includes(d.key)
                      return (
                        <button
                          key={d.key}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleDay(window.id, d.key)}
                          className={`calendar-day-pill px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                            selected ? 'calendar-day-pill--active' : ''
                          }`}
                        >
                          {d.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                {addedForWindow(window).length > 0 && (
                  <div className="rounded-md border border-green-200 bg-green-50 p-3">
                    <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Added to Google Calendar ({addedForWindow(window).length})
                    </p>
                    <ul className="space-y-2">{addedForWindow(window).map(renderAddedItem)}</ul>
                  </div>
                )}
              </div>
            ))}
          </div>
          {unmatchedAdded.length > 0 && (
            <div className="rounded-md border border-green-200 bg-green-50 p-4 mb-4">
              <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Added outside saved windows ({unmatchedAdded.length})
              </p>
              <ul className="space-y-2">{unmatchedAdded.map(renderAddedItem)}</ul>
            </div>
          )}
          <Button type="button" onClick={addWindow} variant="outline" size="sm" className="mb-4">
            <Plus className="h-4 w-4 mr-2" />
            Add time window
          </Button>
          <div>
            <Button onClick={savePrefs} disabled={savingPrefs} variant="outline" size="sm">
              {savingPrefs ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save windows
            </Button>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Schedule Items</h2>
            <Button
              onClick={generate}
              disabled={generating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {generating ? 'Generating…' : 'Generate recommendations'}
            </Button>
          </div>

          {recsMessage && <p className="text-sm text-gray-600 mb-3">{recsMessage}</p>}

          {recs.length > 0 && (
            <div className="space-y-3">
              {recs.map((rec) => (
                <div
                  key={rec.id}
                  className={`rounded-lg border p-4 ${
                    rec.added ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={!!rec.selected}
                      disabled={rec.added}
                      onChange={(e) => updateRec(rec.id, { selected: e.target.checked })}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    <div className="flex-1 min-w-0">
                      {editingId === rec.id ? (
                        <div className="space-y-2">
                          <input
                            value={rec.title}
                            onChange={(e) => updateRec(rec.id, { title: e.target.value })}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm font-medium"
                          />
                          <textarea
                            value={rec.description}
                            onChange={(e) => updateRec(rec.id, { description: e.target.value })}
                            rows={2}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                          <div className="flex flex-wrap gap-2">
                            <select
                              value={rec.weekday}
                              onChange={(e) => updateRec(rec.id, { weekday: e.target.value })}
                              className="border border-gray-300 rounded px-2 py-1 text-sm"
                            >
                              {DAYS.map((d) => (
                                <option key={d.key} value={d.key}>
                                  {d.label}
                                </option>
                              ))}
                            </select>
                            <input
                              type="time"
                              value={rec.start_time}
                              onChange={(e) => updateRec(rec.id, { start_time: e.target.value })}
                              className="border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                            <select
                              value={rec.duration_minutes}
                              onChange={(e) =>
                                updateRec(rec.id, {
                                  duration_minutes: parseInt(e.target.value, 10),
                                })
                              }
                              className="border border-gray-300 rounded px-2 py-1 text-sm"
                            >
                              {[15, 30, 45, 60, 90, 120].map((m) => (
                                <option key={m} value={m}>
                                  {m} min
                                </option>
                              ))}
                            </select>
                            <select
                              value={rec.recurrence}
                              onChange={(e) =>
                                updateRec(rec.id, {
                                  recurrence: e.target.value as Recommendation['recurrence'],
                                })
                              }
                              className="border border-gray-300 rounded px-2 py-1 text-sm"
                            >
                              <option value="none">One-time</option>
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                            </select>
                          </div>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            Done
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{rec.title}</span>
                            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">
                              {rec.source_type}
                            </span>
                            {rec.recurrence !== 'none' && (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                <Repeat className="h-3 w-3" />
                                {rec.recurrence}
                              </span>
                            )}
                          </div>
                          {rec.description && (
                            <p className="text-sm text-gray-600 mt-0.5">{rec.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {DAYS.find((d) => d.key === rec.weekday)?.label} · {rec.start_time} ·{' '}
                            {rec.duration_minutes} min
                          </p>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {rec.added ? (
                        <span className="inline-flex items-center gap-1 text-sm text-green-700">
                          <Check className="h-4 w-4" /> Added
                        </span>
                      ) : (
                        <button
                          onClick={() => setEditingId(editingId === rec.id ? null : rec.id)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-gray-600">{selectedCount} selected</p>
                <Button
                  onClick={addSelected}
                  disabled={adding || selectedCount === 0 || !status?.connected}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {adding ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Calendar className="h-4 w-4 mr-2" />
                  )}
                  Add to Calendar
                </Button>
              </div>
              {!status?.connected && (
                <p className="text-xs text-amber-700">
                  Connect Google Calendar above to add events.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
