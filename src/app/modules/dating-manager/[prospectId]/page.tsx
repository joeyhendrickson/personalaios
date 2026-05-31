'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
  Star,
  HeartHandshake,
  Camera,
  Save,
} from 'lucide-react'

type Photo = {
  id: string
  storage_path: string
  kind: 'prospect' | 'couple'
  analysis: Record<string, unknown>
  created_at: string
  signed_url?: string | null
}

type Prospect = {
  id: string
  name: string
  status: string
  zip_code?: string | null
  how_we_met?: string | null
  positive_qualities?: string | null
  toxic_qualities?: string | null
  unknowns?: string | null
  feels_known?: string | null
  conflict_style?: string | null
  notes?: string | null
  assessment?: Record<string, string>
  attractiveness_score?: number | null
}

type Evaluation = {
  result?: {
    overall_score?: number
    verdict?: string
    summary?: string
    green_flags?: string[]
    red_flags?: string[]
    unknowns_to_explore?: string[]
    alignment_to_vision?: string
    reflective_questions?: string[]
  }
  created_at?: string
}

const ASSESSMENT_QUESTIONS: { key: string; label: string }[] = [
  { key: 'emotional_safety', label: 'When you’re vulnerable with them, how do they respond?' },
  { key: 'effort_reciprocity', label: 'Who initiates and invests more — is effort mutual?' },
  { key: 'values_alignment', label: 'Where do your values and life direction overlap or clash?' },
  {
    key: 'treats_others',
    label: 'How do they treat people who can do nothing for them?',
  },
  {
    key: 'energy_after',
    label: 'After time together, do you feel energized or drained?',
  },
]

export default function ProspectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.prospectId as string

  const [prospect, setProspect] = useState<Prospect | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [uploadKind, setUploadKind] = useState<'prospect' | 'couple'>('prospect')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dating-manager/prospects/${id}`)
      const json = await res.json()
      if (res.ok) {
        setProspect(json.prospect)
        setPhotos(json.photos ?? [])
        setEvaluation(json.evaluation ?? null)
      } else {
        setError(json?.error || 'Could not load prospect')
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const setField = (key: keyof Prospect, value: string) =>
    setProspect((p) => (p ? { ...p, [key]: value } : p))

  const setAssessment = (key: string, value: string) =>
    setProspect((p) => (p ? { ...p, assessment: { ...(p.assessment || {}), [key]: value } } : p))

  const save = async () => {
    if (!prospect) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/dating-manager/prospects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: prospect.name,
          zip_code: prospect.zip_code ?? null,
          how_we_met: prospect.how_we_met ?? null,
          positive_qualities: prospect.positive_qualities ?? null,
          toxic_qualities: prospect.toxic_qualities ?? null,
          unknowns: prospect.unknowns ?? null,
          feels_known: prospect.feels_known ?? null,
          conflict_style: prospect.conflict_style ?? null,
          notes: prospect.notes ?? null,
          assessment: prospect.assessment ?? {},
        }),
      })
      const json = await res.json()
      if (!res.ok) setError(json?.error || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const onUpload = async (file: File) => {
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kind', uploadKind)
      const res = await fetch(`/api/dating-manager/prospects/${id}/photos`, {
        method: 'POST',
        body: fd,
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'Upload failed')
        return
      }
      setPhotos((prev) => [json.photo, ...prev])
      if (uploadKind === 'prospect') void load()
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const evaluate = async () => {
    setEvaluating(true)
    setError('')
    try {
      const res = await fetch(`/api/dating-manager/prospects/${id}/evaluate`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'Evaluation failed')
        return
      }
      setEvaluation(json.evaluation)
    } finally {
      setEvaluating(false)
    }
  }

  const remove = async () => {
    if (!confirm('Delete this prospect and all its photos?')) return
    const res = await fetch(`/api/dating-manager/prospects/${id}`, { method: 'DELETE' })
    if (res.ok) router.push('/modules/dating-manager')
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!prospect) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Link
          href="/modules/dating-manager"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <p className="mt-4 text-sm text-red-600">{error || 'Prospect not found.'}</p>
      </div>
    )
  }

  const field = (label: string, key: keyof Prospect, placeholder: string, rows = 3) => (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <textarea
        value={(prospect[key] as string) || ''}
        onChange={(e) => setField(key, e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
    </label>
  )

  const ev = evaluation?.result
  const evList = (label: string, items?: string[]) =>
    items && items.length > 0 ? (
      <div>
        <h4 className="text-sm font-semibold">{label}</h4>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-foreground/80">
          {items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      </div>
    ) : null

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Link
        href="/modules/dating-manager"
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All prospects
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={prospect.name}
          onChange={(e) => setField('name', e.target.value)}
          className="rounded-md border border-transparent bg-transparent text-2xl font-semibold hover:border-gray-300 focus:border-gray-300"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
          <button
            type="button"
            onClick={remove}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Qualities + reflection */}
        <section className="space-y-4 rounded-lg border border-border bg-card p-5">
          <h2 className="text-lg font-medium">Qualities & interactions</h2>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Zip code</span>
            <input
              value={prospect.zip_code || ''}
              onChange={(e) => setField('zip_code', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:max-w-[200px]"
              placeholder="For date ideas"
            />
          </label>
          {field('How you met', 'how_we_met', 'Where and how you met…', 2)}
          {field(
            'Positive qualities',
            'positive_qualities',
            'What draws you to them, what they do well…'
          )}
          {field('Toxic / concerning qualities', 'toxic_qualities', 'Patterns that worry you…')}
          {field(
            'Do they make you feel known?',
            'feels_known',
            'Do they truly see and understand you?',
            2
          )}
          {field(
            'Conflict style',
            'conflict_style',
            'Do they argue or fight to gain control? How do disagreements go?',
            2
          )}
          {field('Unknown areas', 'unknowns', 'What you still don’t know about them…', 2)}
          {field('Other notes', 'notes', 'Anything else…', 2)}
        </section>

        {/* Guided reflection + photos */}
        <div className="space-y-6">
          <section className="space-y-4 rounded-lg border border-border bg-card p-5">
            <h2 className="text-lg font-medium">Guided reflection</h2>
            {ASSESSMENT_QUESTIONS.map((q) => (
              <label key={q.key} className="block">
                <span className="text-sm font-medium text-foreground">{q.label}</span>
                <textarea
                  value={prospect.assessment?.[q.key] || ''}
                  onChange={(e) => setAssessment(q.key, e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
            ))}
          </section>

          <section className="space-y-4 rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-rose-500" />
              <h2 className="text-lg font-medium">Photos & AI analysis</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={uploadKind}
                onChange={(e) => setUploadKind(e.target.value as 'prospect' | 'couple')}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="prospect">Their photo (attractiveness)</option>
                <option value="couple">Photo of us (connection)</option>
              </select>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted/60 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload photo
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void onUpload(f)
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              For couple photos, AI reads expressions for genuine connection — quality over
              quantity.
            </p>

            <div className="space-y-3">
              {photos.map((ph) => {
                const a = ph.analysis || {}
                return (
                  <div
                    key={ph.id}
                    className="flex gap-3 rounded-lg border border-border bg-background p-3"
                  >
                    {ph.signed_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ph.signed_url}
                        alt=""
                        className="h-24 w-24 shrink-0 rounded-md object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1 text-sm">
                      {ph.kind === 'couple' ? (
                        <>
                          <p className="flex items-center gap-1 font-medium text-rose-700">
                            <HeartHandshake className="h-4 w-4" />
                            Connection {String(a.connection_score ?? '?')}/100
                          </p>
                          {typeof a.emotional_read === 'string' && (
                            <p className="mt-1 text-foreground/80">{a.emotional_read}</p>
                          )}
                          {Array.isArray(a.expressions) && a.expressions.length > 0 && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {(a.expressions as string[]).join(' · ')}
                            </p>
                          )}
                          {typeof a.caution === 'string' && a.caution && (
                            <p className="mt-1 text-xs italic text-muted-foreground">{a.caution}</p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="flex items-center gap-1 font-medium text-rose-700">
                            <Star className="h-4 w-4" />
                            Attractiveness {String(a.attractiveness_score ?? '?')}/100
                          </p>
                          {typeof a.appearance_summary === 'string' && (
                            <p className="mt-1 text-foreground/80">{a.appearance_summary}</p>
                          )}
                          {typeof a.alignment_question === 'string' && (
                            <p className="mt-1 text-xs italic text-muted-foreground">
                              {a.alignment_question}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>

      {/* AI evaluation */}
      <section className="mt-6 space-y-4 rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-rose-500" />
            <h2 className="text-lg font-medium">AI evaluation</h2>
          </div>
          <button
            type="button"
            onClick={evaluate}
            disabled={evaluating}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {evaluating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {ev ? 'Re-evaluate' : 'Evaluate'}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Save your notes first, then evaluate — weighs emotional safety and life-alignment above
          looks.
        </p>

        {ev ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {typeof ev.overall_score === 'number' && (
                <span className="rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-700">
                  {ev.overall_score}/100
                </span>
              )}
              {ev.verdict && <span className="text-sm font-medium">{ev.verdict}</span>}
            </div>
            {ev.summary && <p className="text-sm text-foreground/90">{ev.summary}</p>}
            {evList('Green flags', ev.green_flags)}
            {evList('Red flags', ev.red_flags)}
            {evList('Unknowns to explore', ev.unknowns_to_explore)}
            {ev.alignment_to_vision && (
              <div>
                <h4 className="text-sm font-semibold">Alignment to your vision</h4>
                <p className="mt-1 text-sm text-foreground/80">{ev.alignment_to_vision}</p>
              </div>
            )}
            {evList('Questions to sit with', ev.reflective_questions)}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No evaluation yet. Add details and photos, then evaluate.
          </p>
        )}
      </section>
    </div>
  )
}
