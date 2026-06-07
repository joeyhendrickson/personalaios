'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Link as LinkIcon,
  Loader2,
  RefreshCw,
  Upload,
  Watch,
} from 'lucide-react'

export type FitnessBiometricRow = {
  id: string
  recorded_at: string
  sleep_hours?: number | null
  blood_pressure_systolic?: number | null
  blood_pressure_diastolic?: number | null
  resting_heart_rate?: number | null
  steps?: number | null
  stress_level_1_10?: number | null
  energy_level_self_1_10?: number | null
  contextual_energy_level_1_10?: number | null
  iphone_summary_image_url?: string | null
  fitbit_opt_in?: boolean | null
  source?: string | null
  sync_date?: string | null
  notes?: string | null
}

type HealthPreferences = {
  import_sleep: boolean
  import_resting_heart_rate: boolean
  import_steps: boolean
}

type HealthStatus = {
  configured: boolean
  connected: boolean
  status: 'connected' | 'needs_reauth' | null
  connected_email: string | null
  last_synced_at: string | null
  last_sync_error: string | null
  preferences: HealthPreferences | null
}

export default function BiometricsSection(props: {
  latestFitbitOptIn?: boolean
  onAfterSave: (biometrics?: FitnessBiometricRow[]) => void | Promise<void>
}) {
  const { onAfterSave } = props

  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [localError, setLocalError] = useState('')

  // Wearable connection (Google Health API — Fitbit/Google device data via Google login)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [connectMessage, setConnectMessage] = useState('')
  const [connectError, setConnectError] = useState('')

  // "Request access" form (Testing-mode allowlist)
  const [showRequest, setShowRequest] = useState(false)
  const [requestEmail, setRequestEmail] = useState('')
  const [requestSubmitting, setRequestSubmitting] = useState(false)
  const [requestDone, setRequestDone] = useState(false)
  const [requestError, setRequestError] = useState('')

  const loadHealthStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/fitness/google-health/status')
      if (res.ok) setHealth(await res.json())
    } catch {
      // non-fatal; manual entry still works
    }
  }, [])

  const syncHealth = useCallback(async () => {
    setSyncing(true)
    setConnectError('')
    setConnectMessage('')
    try {
      const res = await fetch('/api/fitness/google-health/sync', {
        method: 'POST',
        cache: 'no-store',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setConnectError([json?.error, json?.details].filter(Boolean).join(': ') || 'Sync failed')
      } else {
        setConnectMessage(json?.message || 'Synced from Google Health.')
        const synced = Array.isArray(json?.biometrics) ? json.biometrics : undefined
        await onAfterSave(synced)
      }
    } catch {
      setConnectError('Sync failed. Please try again.')
    } finally {
      setSyncing(false)
      await loadHealthStatus()
    }
  }, [onAfterSave, loadHealthStatus])

  useEffect(() => {
    void loadHealthStatus()
  }, [loadHealthStatus])

  // Handle the redirect back from the Google Health OAuth callback.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const healthParam = params.get('health')
    if (!healthParam) return

    if (healthParam === 'connected') {
      setConnectMessage('Google Health connected. Pulling your latest stats…')
      void syncHealth()
    } else if (healthParam === 'error') {
      setConnectError(
        `Couldn't connect Google Health (${params.get('reason') || 'unknown error'}).`
      )
    }

    params.delete('health')
    params.delete('reason')
    const cleaned = params.toString()
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${cleaned ? `?${cleaned}` : ''}`
    )
  }, [syncHealth])

  const handleConnect = async () => {
    setConnecting(true)
    setConnectError('')
    try {
      const res = await fetch('/api/fitness/google-health/connect')
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.auth_url) {
        setConnectError(json?.error || 'Could not start Google Health connection.')
        setConnecting(false)
        return
      }
      window.location.href = json.auth_url
    } catch {
      setConnectError('Could not start Google Health connection.')
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Google Health? Your already-saved stats stay; auto-sync stops.'))
      return
    try {
      await fetch('/api/fitness/google-health/disconnect', { method: 'POST' })
    } finally {
      setConnectMessage('')
      setConnectError('')
      await loadHealthStatus()
    }
  }

  const submitAccessRequest = async () => {
    setRequestSubmitting(true)
    setRequestError('')
    try {
      const res = await fetch('/api/fitness/google-health/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: requestEmail.trim() }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setRequestError(json?.error || 'Could not send your request.')
      } else {
        setRequestDone(true)
      }
    } catch {
      setRequestError('Could not send your request. Please try again.')
    } finally {
      setRequestSubmitting(false)
    }
  }

  const updatePreference = async (key: keyof HealthPreferences, value: boolean) => {
    setHealth((prev) =>
      prev && prev.preferences
        ? { ...prev, preferences: { ...prev.preferences, [key]: value } }
        : prev
    )
    try {
      await fetch('/api/fitness/google-health/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
    } catch {
      await loadHealthStatus()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setLocalError('')
    try {
      let iphoneSummaryImageUrl: string | null = null
      if (screenshotFile) {
        const fd = new FormData()
        fd.append('screenshot', screenshotFile)
        const up = await fetch('/api/fitness/biometrics/upload-summary', {
          method: 'POST',
          body: fd,
        })
        if (!up.ok) {
          const j = await up.json().catch(() => ({}))
          throw new Error(j?.error || j?.details || 'Screenshot upload failed')
        }
        const j = await up.json()
        iphoneSummaryImageUrl = j.image_url ?? null
      }

      const body: Record<string, unknown> = {
        iphone_summary_image_url: iphoneSummaryImageUrl,
        fitbit_opt_in: !!health?.connected,
      }

      const res = await fetch('/api/fitness/biometrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || j?.details || 'Failed to save biometrics')
      }

      setScreenshotFile(null)
      await onAfterSave()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-amber-200 bg-amber-50/40 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-1">
        <Activity className="h-5 w-5 text-amber-700" />
        Biometrics
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Connect Google Health to sync sleep, steps, and resting HR. Stress and self energy are
        computed automatically to adapt your workout recommendations (coaching only — not medical
        advice).
      </p>

      {/* Wearable connection */}
      {health?.configured !== false && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
          {!health?.connected ? (
            <div className="flex flex-col gap-3">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 flex items-center gap-2">
                  <Watch className="h-4 w-4 text-gray-600" />
                  Auto-fill from your wearable
                </p>
                <p className="text-sm text-gray-600 mt-0.5">
                  Connect Google Health (sign in with your Google account) to sync sleep, resting
                  heart rate, and steps from your Fitbit or Google device automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={handleConnect}
                disabled={connecting}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 touch-manipulation"
              >
                {connecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LinkIcon className="h-4 w-4" />
                )}
                Connect Google Health
              </button>

              <div className="border-t border-gray-100 pt-3">
                {!showRequest && !requestDone && (
                  <button
                    type="button"
                    onClick={() => setShowRequest(true)}
                    className="text-xs text-gray-500 underline hover:text-gray-700 touch-manipulation"
                  >
                    Getting &ldquo;access blocked&rdquo;? Request wearable access
                  </button>
                )}

                {requestDone ? (
                  <p className="text-sm text-green-700">
                    Request sent. We&apos;ll enable your account and email you when it&apos;s ready.
                  </p>
                ) : (
                  showRequest && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-gray-600">
                        Wearable sync is in limited early access. Enter the Google email you&apos;ll
                        connect with and we&apos;ll enable it for you.
                      </p>
                      <input
                        type="email"
                        value={requestEmail}
                        onChange={(e) => setRequestEmail(e.target.value)}
                        placeholder="you@gmail.com"
                        className="w-full sm:max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={submitAccessRequest}
                          disabled={requestSubmitting || !requestEmail.trim()}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 touch-manipulation"
                        >
                          {requestSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                          Request access
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRequest(false)}
                          className="text-sm text-gray-500 hover:text-gray-700 touch-manipulation"
                        >
                          Cancel
                        </button>
                      </div>
                      {requestError && (
                        <p className="text-sm text-red-600" role="alert">
                          {requestError}
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {health.status === 'needs_reauth' ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    Reconnect needed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Google Health connected
                  </span>
                )}
                {health.connected_email && (
                  <span className="text-xs text-gray-500 truncate max-w-[12rem]">
                    {health.connected_email}
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  {health.last_synced_at
                    ? `Last synced ${new Date(health.last_synced_at).toLocaleString()}`
                    : 'Not synced yet'}
                </span>
              </div>

              {health.status === 'needs_reauth' ? (
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={connecting}
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 touch-manipulation"
                >
                  {connecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LinkIcon className="h-4 w-4" />
                  )}
                  Reconnect Google Health
                </button>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-700">
                    {(
                      [
                        ['import_sleep', 'Sleep'],
                        ['import_resting_heart_rate', 'Resting HR'],
                        ['import_steps', 'Steps'],
                      ] as [keyof HealthPreferences, string][]
                    ).map(([key, label]) => (
                      <label key={key} className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={health.preferences?.[key] ?? true}
                          onChange={(e) => updatePreference(key, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-green-600"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={syncHealth}
                      disabled={syncing}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 touch-manipulation"
                    >
                      <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                      {syncing ? 'Syncing…' : 'Sync now'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:text-red-600 touch-manipulation"
                    >
                      Disconnect
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {connectMessage && <p className="mt-3 text-sm text-green-700">{connectMessage}</p>}
          {connectError && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {connectError}
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <span className="text-sm font-medium text-gray-700 block mb-1">
            Upload Biometrics Screenshot (Google Health, Fitness App, etc.)
          </span>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-green-700 hover:text-green-800">
            <Upload className="h-4 w-4" />
            <span>{screenshotFile ? screenshotFile.name : 'Choose image…'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setScreenshotFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Stored securely for your records alongside your synced biometrics.
          </p>
        </div>

        {localError && (
          <p className="text-sm text-red-600" role="alert">
            {localError}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving…
              </>
            ) : (
              'Manual Update'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
