'use client'

import { useEffect, useState } from 'react'
import { Check, Eye, Palette, Pencil, Sparkles, X } from 'lucide-react'

const TONE_PROMPTS = [
  {
    label: 'Make it bolder',
    prompt:
      'Rewrite the vision so it is bolder and more specific. Stay on the vision — do not move to goals yet.',
  },
  {
    label: 'Softer',
    prompt:
      'Rewrite the vision so it feels warmer and more grounded. Stay on the vision — do not move to goals yet.',
  },
  {
    label: 'More personal',
    prompt:
      'Rewrite the vision in my own voice, more personal and present-tense. Stay on the vision — do not move to goals yet.',
  },
] as const

type VisionCanvasProps = {
  statement: string
  dreams?: string[]
  accepted: boolean
  busy?: boolean
  onChange: (next: string) => void
  onKeep: (statement: string) => void
  onRefine: (prompt: string) => void
}

export function VisionCanvas({
  statement,
  dreams = [],
  accepted,
  busy = false,
  onChange,
  onKeep,
  onRefine,
}: VisionCanvasProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(statement)

  useEffect(() => {
    if (!editing) setDraft(statement)
  }, [statement, editing])

  const visibleDreams = dreams.filter((d) => d.trim().length > 0).slice(0, 6)
  const current = editing ? draft : statement

  const saveEdit = () => {
    const next = draft.trim()
    if (!next) return
    onChange(next)
    setEditing(false)
  }

  const cancelEdit = () => {
    setDraft(statement)
    setEditing(false)
  }

  return (
    <section
      aria-label="Your painted vision"
      className="relative overflow-hidden rounded-2xl border border-amber-200/80 shadow-[0_18px_50px_rgba(120,53,15,0.12)]"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-100 via-rose-50 to-sky-100"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-amber-300/45 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-10 top-6 h-52 w-52 rounded-full bg-fuchsia-300/35 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-72 rounded-full bg-sky-300/35 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 20% 10%, rgba(251,191,36,0.35), transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(56,189,248,0.28), transparent 45%)',
        }}
        aria-hidden="true"
      />

      <div className="relative p-6 sm:p-8">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-white/70 p-2 shadow-sm">
              <Palette className="h-5 w-5 text-amber-700" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-amber-950 sm:text-xl">
                {accepted ? 'Your vision' : 'Sit with this vision'}
              </h2>
              <p className="text-xs text-amber-900/70">
                {accepted
                  ? 'Nothing is added to your dashboard until you confirm your Life Plan.'
                  : 'Paint it with me — edit, reshape, then keep it. It stays here until you confirm.'}
              </p>
            </div>
          </div>
          {accepted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
              <Check className="h-3 w-3" aria-hidden="true" />
              Kept for now
            </span>
          )}
        </div>

        {visibleDreams.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2" aria-label="Dreams in this painting">
            {visibleDreams.map((dream) => (
              <span
                key={dream}
                className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/50 px-2.5 py-1 text-[11px] font-medium text-amber-900/80 shadow-sm backdrop-blur-sm"
              >
                <Sparkles className="h-3 w-3 text-amber-600" aria-hidden="true" />
                {dream}
              </span>
            ))}
          </div>
        )}

        {editing ? (
          <label className="block">
            <span className="sr-only">Edit your vision</span>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={5}
              maxLength={2000}
              className="w-full resize-none rounded-xl border border-amber-200/80 bg-white/80 px-4 py-3 text-base leading-relaxed text-amber-950 shadow-inner focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
              autoFocus
            />
          </label>
        ) : (
          <blockquote className="rounded-xl bg-white/45 px-5 py-6 shadow-inner backdrop-blur-[2px]">
            <p className="font-serif text-xl leading-relaxed text-amber-950 sm:text-2xl">
              <Eye className="mb-1 mr-2 inline h-5 w-5 text-amber-700" aria-hidden="true" />
              {current}
            </p>
          </blockquote>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {editing ? (
            <>
              <button
                type="button"
                onClick={saveEdit}
                disabled={!draft.trim() || busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-900 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                Save wording
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white/70 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-white disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </>
          ) : (
            <>
              {!accepted && (
                <button
                  type="button"
                  onClick={() => onKeep(current.trim())}
                  disabled={busy || !current.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  Keep this vision
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setDraft(current)
                  setEditing(true)
                }}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white/80 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-white disabled:opacity-50"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              {!accepted &&
                TONE_PROMPTS.map((tone) => (
                  <button
                    key={tone.label}
                    type="button"
                    onClick={() => onRefine(tone.prompt)}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50/80 px-3 py-1.5 text-xs font-medium text-purple-800 hover:bg-purple-100 disabled:opacity-50"
                  >
                    {tone.label}
                  </button>
                ))}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
