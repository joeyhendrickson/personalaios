'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { MEANING_CATEGORIES } from '@/lib/narrative-integration/meaning-categories'

type SavedMeaning = {
  id: string
  category: string | null
  final_meaning_statement: string | null
  user_selected_meaning: string | null
  updated_at: string
}

type MeaningRow = {
  clientId: string
  id?: string
  category: string
  statement: string
  updatedAt?: string
}

const MEANING_PHASES = new Set([
  'meaning_making',
  'present_grounding',
  'future_reorientation',
  'closure_summary',
])

function newRow(partial?: Partial<MeaningRow>): MeaningRow {
  return {
    clientId: partial?.id || `new-${crypto.randomUUID()}`,
    id: partial?.id,
    category: partial?.category || MEANING_CATEGORIES[0],
    statement: partial?.statement || '',
    updatedAt: partial?.updatedAt,
  }
}

function rowFromSaved(m: SavedMeaning): MeaningRow {
  return newRow({
    id: m.id,
    category: m.category || MEANING_CATEGORIES[0],
    statement: m.final_meaning_statement || m.user_selected_meaning || '',
    updatedAt: m.updated_at,
  })
}

export default function MeaningCards(props: {
  session: {
    id: string
    meaning_statement: string | null
    current_phase: string
    safety_status: string
    completion_status?: string
  }
  disabled: boolean
  onRefresh: () => void
}) {
  const [savedMeanings, setSavedMeanings] = useState<SavedMeaning[]>([])
  const [rows, setRows] = useState<MeaningRow[]>([newRow()])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingClientId, setEditingClientId] = useState<string | null>(null)

  const inMeaningPhase = MEANING_PHASES.has(props.session.current_phase)
  const hasSaved = savedMeanings.length > 0
  const showEditor = inMeaningPhase || hasSaved
  const showPlaceholder = !inMeaningPhase && !hasSaved

  const loadMeanings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(
        `/api/modules/narrative-integration/sessions/${props.session.id}/meaning`
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load meanings')

      const meanings: SavedMeaning[] = json.meanings || []
      setSavedMeanings(meanings)

      if (meanings.length === 0) {
        setRows([
          newRow({
            statement: props.session.meaning_statement || '',
          }),
        ])
      } else {
        setRows(meanings.map(rowFromSaved))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load meanings')
    } finally {
      setLoading(false)
    }
  }, [props.session.id, props.session.meaning_statement])

  useEffect(() => {
    loadMeanings()
  }, [loadMeanings])

  const savedById = useMemo(() => {
    const map = new Map<string, SavedMeaning>()
    for (const m of savedMeanings) map.set(m.id, m)
    return map
  }, [savedMeanings])

  const addMeaning = () => {
    const row = newRow()
    setRows((prev) => [...prev, row])
    setEditingClientId(row.clientId)
  }

  const updateRow = (
    clientId: string,
    patch: Partial<Pick<MeaningRow, 'category' | 'statement'>>
  ) => {
    setRows((prev) => prev.map((r) => (r.clientId === clientId ? { ...r, ...patch } : r)))
  }

  const deleteSaved = async (meaningId: string) => {
    if (
      !window.confirm('Remove this meaning from your map? This cannot be undone for this session.')
    ) {
      return
    }
    try {
      setError(null)
      setSuccess(null)
      const res = await fetch(
        `/api/modules/narrative-integration/sessions/${props.session.id}/meaning?id=${meaningId}`,
        { method: 'DELETE' }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to delete meaning')
      setSuccess('Meaning removed.')
      if (editingClientId) setEditingClientId(null)
      props.onRefresh()
      await loadMeanings()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete meaning')
    }
  }

  const removeDraftRow = (row: MeaningRow) => {
    if (row.id) return
    setRows((prev) => {
      const next = prev.filter((r) => r.clientId !== row.clientId)
      return next.length > 0 ? next : [newRow()]
    })
    if (editingClientId === row.clientId) setEditingClientId(null)
  }

  const saveRow = async (row: MeaningRow) => {
    if (!row.statement.trim()) {
      setError('Write a meaning statement before saving.')
      return
    }
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      const res = await fetch(
        `/api/modules/narrative-integration/sessions/${props.session.id}/meaning`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: row.id,
            category: row.category,
            final_meaning_statement: row.statement.trim(),
            user_selected_meaning: row.statement.trim(),
            user_edited: true,
            confidence_level: 7,
          }),
        }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to save meaning')
      setSuccess(row.id ? 'Meaning updated.' : 'Meaning saved.')
      setEditingClientId(null)
      props.onRefresh()
      await loadMeanings()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save meaning')
    } finally {
      setSaving(false)
    }
  }

  const saveAll = async (advancePhase: boolean) => {
    const toSave = rows.filter((r) => r.statement.trim() || r.id)
    if (toSave.length === 0) {
      setError('Add at least one meaning statement before saving.')
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      for (const row of toSave) {
        if (!row.statement.trim() && row.id) continue
        const res = await fetch(
          `/api/modules/narrative-integration/sessions/${props.session.id}/meaning`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: row.id,
              category: row.category,
              final_meaning_statement: row.statement.trim(),
              user_selected_meaning: row.statement.trim(),
              user_edited: true,
              confidence_level: 7,
            }),
          }
        )
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Failed to save meaning')
      }

      if (advancePhase) {
        const res = await fetch(`/api/modules/narrative-integration/sessions/${props.session.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ current_phase: 'present_grounding' }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Failed to continue')
      }

      setSuccess(advancePhase ? 'Meanings saved. Continuing to grounding.' : 'All meanings saved.')
      setEditingClientId(null)
      await loadMeanings()
      props.onRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save meanings')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (meaningId: string) => {
    const row = rows.find((r) => r.id === meaningId)
    if (row) {
      setEditingClientId(row.clientId)
      document.getElementById(`meaning-row-${row.clientId}`)?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="mb-4">
        <h2 className="font-semibold text-gray-900">Meaning map</h2>
        <p className="text-sm text-gray-600">
          Review, edit, or remove meanings you have saved for this narrative. Guided reflection uses
          your latest map.
        </p>
      </div>

      {showPlaceholder && (
        <p className="text-sm text-gray-600 mb-4 rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
          Your meaning map will unlock during the meaning-making step. Any meanings you save here
          stay with this session so you can revisit them later.
        </p>
      )}

      {error && (
        <div className="mb-4 text-sm bg-red-50 border border-red-200 rounded-lg p-3 text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 text-sm bg-green-50 border border-green-200 rounded-lg p-3 text-green-800">
          {success}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-600">Loading your meaning map…</p>
      ) : (
        <>
          {hasSaved && (
            <section className="mb-6" aria-label="Saved meanings">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Saved meanings ({savedMeanings.length})
              </h3>
              <ul className="space-y-3">
                {savedMeanings.map((m) => {
                  const stmt = (m.final_meaning_statement || m.user_selected_meaning || '').trim()
                  const isEditing = rows.some(
                    (r) => r.id === m.id && r.clientId === editingClientId
                  )
                  return (
                    <li
                      key={m.id}
                      className={`rounded-lg border p-4 ${
                        isEditing ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <span className="inline-block text-xs font-medium text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                            {m.category || 'Uncategorized'}
                          </span>
                          <p className="mt-2 text-sm text-gray-900 whitespace-pre-wrap">{stmt}</p>
                          <p className="mt-2 text-xs text-gray-500">
                            Saved {new Date(m.updated_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(m.id)}
                            disabled={props.disabled}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-300 bg-white text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSaved(m.id)}
                            disabled={props.disabled}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-red-200 bg-white text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {showEditor && (
            <section aria-label="Edit meaning map">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                {hasSaved ? 'Add or edit meanings' : 'Build your meaning map'}
              </h3>
              <div className="space-y-5">
                {rows.map((row, index) => {
                  const isSaved = !!row.id && savedById.has(row.id)
                  const isEditing = editingClientId === row.clientId || !row.id
                  const showForm = isEditing || rows.length === 1

                  if (isSaved && !showForm && editingClientId !== row.clientId) {
                    return null
                  }

                  return (
                    <div
                      key={row.clientId}
                      id={`meaning-row-${row.clientId}`}
                      className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-5 border-b border-gray-100 last:border-0 last:pb-0"
                    >
                      <div className="lg:col-span-2 flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-700">
                          {row.id ? `Meaning ${index + 1}` : 'New meaning'}
                        </span>
                        {isSaved && (
                          <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                            Saved
                          </span>
                        )}
                        {row.updatedAt && isSaved && (
                          <span className="text-xs text-gray-500">
                            · updated {new Date(row.updatedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          Meaning category
                        </label>
                        <select
                          value={row.category}
                          onChange={(e) => updateRow(row.clientId, { category: e.target.value })}
                          disabled={props.disabled}
                          className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        >
                          {MEANING_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          Meaning statement
                        </label>
                        <textarea
                          value={row.statement}
                          onChange={(e) => updateRow(row.clientId, { statement: e.target.value })}
                          disabled={props.disabled}
                          className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          rows={4}
                          placeholder="e.g., 'This taught me what I value and where my boundaries need to be.'"
                        />
                      </div>
                      <div className="lg:col-span-2 flex flex-wrap justify-end gap-2">
                        {row.id && editingClientId === row.clientId && (
                          <button
                            type="button"
                            onClick={() => setEditingClientId(null)}
                            disabled={props.disabled || saving}
                            className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            Cancel edit
                          </button>
                        )}
                        {!row.id && rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDraftRow(row)}
                            disabled={props.disabled}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            Discard draft
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => saveRow(row)}
                          disabled={props.disabled || saving}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving ? 'Saving…' : row.id ? 'Save changes' : 'Save this meaning'}
                        </button>
                      </div>
                    </div>
                  )
                })}

                <button
                  type="button"
                  onClick={addMeaning}
                  disabled={props.disabled}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Add meaning
                </button>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => saveAll(false)}
                  disabled={props.disabled || saving || loading}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-800 font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save all meanings'}
                </button>
                {inMeaningPhase && (
                  <button
                    type="button"
                    onClick={() => saveAll(true)}
                    disabled={props.disabled || saving || loading}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save all & continue'}
                  </button>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
