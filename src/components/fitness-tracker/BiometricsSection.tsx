'use client'

import { useEffect, useState } from 'react'
import { Activity, Loader2, Upload, Watch } from 'lucide-react'

export type FitnessBiometricRow = {
  id: string
  recorded_at: string
  sleep_hours?: number | null
  blood_pressure_systolic?: number | null
  blood_pressure_diastolic?: number | null
  resting_heart_rate?: number | null
  stress_level_1_10?: number | null
  energy_level_self_1_10?: number | null
  contextual_energy_level_1_10?: number | null
  iphone_summary_image_url?: string | null
  fitbit_opt_in?: boolean | null
}

export default function BiometricsSection(props: {
  latestFitbitOptIn?: boolean
  onAfterSave: () => void | Promise<void>
}) {
  const { latestFitbitOptIn, onAfterSave } = props

  const [sleepHours, setSleepHours] = useState('')
  const [bpSys, setBpSys] = useState('')
  const [bpDia, setBpDia] = useState('')
  const [rhr, setRhr] = useState('')
  const [stress, setStress] = useState('')
  const [energySelf, setEnergySelf] = useState('')
  const [fitbitOptIn, setFitbitOptIn] = useState(false)
  const [notes, setNotes] = useState('')
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    setFitbitOptIn(!!latestFitbitOptIn)
  }, [latestFitbitOptIn])

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
        sleep_hours: sleepHours === '' ? null : Number(sleepHours),
        blood_pressure_systolic: bpSys === '' ? null : parseInt(bpSys, 10),
        blood_pressure_diastolic: bpDia === '' ? null : parseInt(bpDia, 10),
        resting_heart_rate: rhr === '' ? null : parseInt(rhr, 10),
        stress_level_1_10: stress === '' ? null : Number(stress),
        energy_level_self_1_10: energySelf === '' ? null : Number(energySelf),
        iphone_summary_image_url: iphoneSummaryImageUrl,
        fitbit_opt_in: fitbitOptIn,
        notes: notes.trim() || null,
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

      setSleepHours('')
      setBpSys('')
      setBpDia('')
      setRhr('')
      setStress('')
      setEnergySelf('')
      setNotes('')
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
        Log sleep, vitals, stress, and energy. We combine these into a contextual energy score to
        adapt your workout recommendations (coaching only — not medical advice).
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Sleep last night (hours)</span>
            <input
              type="number"
              step="0.25"
              min={0}
              max={24}
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. 7.5"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Blood pressure (systolic)</span>
            <input
              type="number"
              value={bpSys}
              onChange={(e) => setBpSys(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="mmHg"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Blood pressure (diastolic)</span>
            <input
              type="number"
              value={bpDia}
              onChange={(e) => setBpDia(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="mmHg"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Resting heart rate</span>
            <input
              type="number"
              value={rhr}
              onChange={(e) => setRhr(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="bpm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Stress (1–10)</span>
            <input
              type="number"
              min={1}
              max={10}
              value={stress}
              onChange={(e) => setStress(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Energy right now (1–10)</span>
            <input
              type="number"
              min={1}
              max={10}
              value={energySelf}
              onChange={(e) => setEnergySelf(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-white cursor-pointer">
          <input
            type="checkbox"
            checked={fitbitOptIn}
            onChange={(e) => setFitbitOptIn(e.target.checked)}
            className="mt-1 h-4 w-4 text-green-600 rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">
            <span className="font-medium inline-flex items-center gap-1">
              <Watch className="h-4 w-4 text-gray-600" />
              Optional Fitbit pairing
            </span>
            <span className="block text-gray-500 mt-0.5">
              Opt in for future sync. When connected, readings can pre-fill this section
              automatically.
            </span>
          </span>
        </label>

        <div>
          <span className="text-sm font-medium text-gray-700 block mb-1">
            iPhone Fitness summary (screenshot, optional)
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
            Stored securely for your records; contextual energy still uses the numeric fields above.
          </p>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Notes (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="Anything else about recovery or how you feel…"
          />
        </label>

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
              'Save biometrics'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
