'use client'

import { useCallback, useEffect, useState } from 'react'
import { Eye, Pencil, Sparkles, Loader2, Check, X, RefreshCw } from 'lucide-react'

type VisionData = {
  vision_statement: string
  updated_at: string | null
  has_goals: boolean
  active_goal_count: number
  needs_update: boolean
}

export function VisionSection() {
  const [data, setData] = useState<VisionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/vision')
      if (!res.ok) {
        setData(null)
        return
      }
      const json = (await res.json()) as VisionData
      setData(json)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  const startEdit = () => {
    setError(null)
    setDraft(data?.vision_statement || '')
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setError(null)
    setDraft('')
  }

  const suggest = async () => {
    setError(null)
    setSuggesting(true)
    try {
      const res = await fetch('/api/vision/suggest', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to get a suggestion')
      setDraft(json.suggestion || '')
      setIsEditing(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get a suggestion')
    } finally {
      setSuggesting(false)
    }
  }

  const save = async () => {
    if (draft.trim().length === 0) {
      setError('Vision statement cannot be empty.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vision_statement: draft.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save vision')
      setIsEditing(false)
      setDraft('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save vision')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="vision-section mb-8 rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-5">
        <div className="vision-section-muted flex items-center text-sm">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading your vision...
        </div>
      </div>
    )
  }

  const hasVision = !!data && data.vision_statement.trim().length > 0

  return (
    <div className="vision-section mb-8 rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="vision-section-icon-wrap rounded-lg bg-white/70 p-2">
            <Eye className="vision-section-icon h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h2 className="vision-section-title text-base font-bold text-gray-900">My Vision</h2>
            <p className="vision-section-subtitle text-xs text-gray-500">
              The future you&apos;re building toward
            </p>
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={startEdit}
            className="vision-edit-btn inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-purple-700 transition-colors hover:text-purple-900"
          >
            <Pencil className="h-4 w-4" />
            <span className="hidden sm:inline">Edit</span>
          </button>
        )}
      </div>

      {error && (
        <div className="vision-error mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {!isEditing && hasVision && data?.needs_update && (
        <div className="vision-update-banner mt-3 flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="vision-update-banner-text flex items-center text-sm text-amber-800">
            <RefreshCw className="mr-2 h-4 w-4 shrink-0" />
            You added a new goal since you set this vision.
          </p>
          <button
            onClick={suggest}
            disabled={suggesting}
            className="vision-primary-btn inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
          >
            {suggesting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Suggest update</span>
              </>
            )}
          </button>
        </div>
      )}

      {isEditing ? (
        <div className="mt-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Describe the life and future you're working toward, in your own words..."
            className="vision-textarea w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-purple-500"
            autoFocus
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={save}
              disabled={saving || draft.trim().length === 0}
              className="vision-primary-btn inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              <span>Save Vision</span>
            </button>
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="vision-secondary-btn inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </button>
            {data?.has_goals && (
              <button
                onClick={suggest}
                disabled={suggesting}
                className="vision-text-btn inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-white/60 disabled:opacity-50"
                title="Generate a vision aligned to your current goals"
              >
                {suggesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>Suggest from my goals</span>
              </button>
            )}
          </div>
        </div>
      ) : hasVision ? (
        <p className="vision-section-body mt-4 text-[15px] italic leading-relaxed text-gray-800">
          &ldquo;{data?.vision_statement}&rdquo;
        </p>
      ) : (
        <div className="mt-4">
          <p className="vision-section-muted mb-3 text-sm text-gray-600">
            You haven&apos;t set a vision yet. Capture what you&apos;re working toward — it keeps
            your goals meaningful.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={startEdit}
              className="vision-primary-btn inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
            >
              <Pencil className="h-4 w-4" />
              <span>Write my vision</span>
            </button>
            {data?.has_goals && (
              <button
                onClick={suggest}
                disabled={suggesting}
                className="vision-secondary-btn inline-flex items-center gap-1.5 rounded-lg border border-purple-300 bg-white px-4 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-50 disabled:opacity-50"
              >
                {suggesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>Generate from my goals</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default VisionSection
