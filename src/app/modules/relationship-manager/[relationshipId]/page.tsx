'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Sparkles, CalendarRange, Target } from 'lucide-react'

type DetailPayload = {
  relationship: Record<string, unknown> & {
    id: string
    name: string
    notes?: string | null
    zip_code?: string | null
    profession?: string | null
    years_known?: number | null
    interests?: string | null
    vision?: string | null
    habits?: string | null
  }
  notes?: { id: string; body: string; is_pinned: boolean; created_at: string }[]
  contactHistory?: {
    id: string
    contact_type: string
    sentiment: string | null
    created_at: string
  }[]
  photos?: { id: string; description?: string | null; source?: string }[]
  documents?: { id: string; file_name: string; kind: string; signed_url?: string | null }[]
  messageScreenshots?: {
    id: string
    caption_notes?: string | null
    ai_thread_summary?: string | null
    created_at: string
    signed_url?: string | null
  }[]
  partial?: boolean
  errors?: string[]
}

export default function RelationshipDetailPage() {
  const params = useParams()
  const id = params.relationshipId as string
  const [data, setData] = useState<DetailPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'context' | 'events' | 'alignment' | 'messages'>('context')

  const [profession, setProfession] = useState('')
  const [yearsKnown, setYearsKnown] = useState('')
  const [interests, setInterests] = useState('')
  const [vision, setVision] = useState('')
  const [habits, setHabits] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [notes, setNotes] = useState('')

  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventsResult, setEventsResult] = useState<unknown>(null)

  const [alignLoading, setAlignLoading] = useState(false)
  const [alignResult, setAlignResult] = useState<unknown>(null)

  const [msgLoading, setMsgLoading] = useState(false)
  const [msgOut, setMsgOut] = useState('')

  const [shotList, setShotList] = useState<
    {
      id: string
      signed_url?: string | null
      caption_notes?: string | null
      ai_thread_summary?: string | null
    }[]
  >([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/relationship-manager/relationships/${id}/detail`)
      const j = (await r.json()) as DetailPayload
      setData(j)
      if (j.relationship) {
        setProfession(String(j.relationship.profession ?? ''))
        setYearsKnown(j.relationship.years_known != null ? String(j.relationship.years_known) : '')
        setInterests(String(j.relationship.interests ?? ''))
        setVision(String(j.relationship.vision ?? ''))
        setHabits(String(j.relationship.habits ?? ''))
        setZipCode(String(j.relationship.zip_code ?? ''))
        setNotes(String(j.relationship.notes ?? ''))
      }
      setShotList(
        (j.messageScreenshots ?? []).map((s) => ({
          id: s.id,
          signed_url: s.signed_url ?? null,
          caption_notes: s.caption_notes,
          ai_thread_summary: s.ai_thread_summary,
        }))
      )
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    void load()
  }, [id, load])

  const saveProfile = async () => {
    setSaving(true)
    try {
      const rawY = yearsKnown.trim()
      const yearsNum = rawY === '' ? null : Number(rawY)
      const res = await fetch(`/api/relationship-manager/relationships/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profession: profession || null,
          years_known: yearsNum != null && Number.isFinite(yearsNum) ? yearsNum : null,
          interests: interests || null,
          vision: vision || null,
          habits: habits || null,
          zip_code: zipCode || null,
          notes: notes || null,
        }),
      })
      if (res.ok) await load()
    } finally {
      setSaving(false)
    }
  }

  const uploadPhoto = async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    await fetch(`/api/relationship-manager/relationships/${id}/photos`, {
      method: 'POST',
      body: fd,
    })
    await load()
  }

  const uploadDoc = async (file: File, kind: string) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('kind', kind)
    await fetch(`/api/relationship-manager/relationships/${id}/documents`, {
      method: 'POST',
      body: fd,
    })
    await load()
  }

  const uploadShot = async (file: File, caption: string) => {
    const fd = new FormData()
    fd.append('file', file)
    if (caption) fd.append('caption_notes', caption)
    await fetch(`/api/relationship-manager/relationships/${id}/message-screenshots`, {
      method: 'POST',
      body: fd,
    })
    await load()
  }

  const runEvents = async () => {
    setEventsLoading(true)
    try {
      const res = await fetch(`/api/relationship-manager/relationships/${id}/suggest-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zip_code: zipCode || undefined }),
      })
      setEventsResult(await res.json())
    } finally {
      setEventsLoading(false)
    }
  }

  const runAlignment = async () => {
    setAlignLoading(true)
    try {
      const res = await fetch(`/api/relationship-manager/relationships/${id}/alignment-insights`, {
        method: 'POST',
      })
      setAlignResult(await res.json())
    } finally {
      setAlignLoading(false)
    }
  }

  const runFramework = async () => {
    setMsgLoading(true)
    try {
      const res = await fetch('/api/relationship-manager/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relationshipId: id, mode: 'framework' }),
      })
      const j = await res.json()
      setMsgOut(JSON.stringify(j.framework ?? j, null, 2))
    } finally {
      setMsgLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    )
  }

  if (!data?.relationship) {
    return (
      <div className="p-8">
        <p className="text-destructive">Not found</p>
        <Link href="/modules/relationship-manager" className="mt-4 inline-block text-sm underline">
          Back
        </Link>
      </div>
    )
  }

  const name = data.relationship.name

  const tabBtn = (k: typeof tab, label: string) => (
    <button
      type="button"
      key={k}
      onClick={() => setTab(k)}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        tab === k
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Link
        href="/modules/relationship-manager"
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All relationships
      </Link>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">{name}</h1>
        <div className="flex flex-wrap gap-2">
          {tabBtn('context', 'Context')}
          {tabBtn('events', 'Local events')}
          {tabBtn('alignment', 'Goals & deals')}
          {tabBtn('messages', 'Message ideas')}
        </div>
      </div>
      {data.partial && (
        <p className="mb-4 text-xs text-amber-600">
          Partial data — apply migrations (038, 042) if tables are missing:{' '}
          {data.errors?.join('; ')}
        </p>
      )}

      {tab === 'context' && (
        <div className="grid gap-8 md:grid-cols-2">
          <section className="space-y-4 rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Profile & context
            </h2>
            <div>
              <label className="text-xs text-muted-foreground">Profession</label>
              <input
                className="mt-1 w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Years known</label>
              <input
                type="number"
                min={0}
                step={0.5}
                className="mt-1 w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                value={yearsKnown}
                onChange={(e) => setYearsKnown(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Zip / locale (for events)</label>
              <input
                className="mt-1 w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="e.g. 94103"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Interests</label>
              <textarea
                className="mt-1 w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                rows={3}
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Their vision / goals</label>
              <textarea
                className="mt-1 w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                rows={3}
                value={vision}
                onChange={(e) => setVision(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Habits & style</label>
              <textarea
                className="mt-1 w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                rows={2}
                value={habits}
                onChange={(e) => setHabits(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">General notes</label>
              <textarea
                className="mt-1 w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveProfile()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </section>

          <div className="space-y-6">
            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Photos
              </h2>
              <label className="mb-3 inline-flex cursor-pointer items-center rounded-md bg-secondary px-3 py-2 text-sm font-medium">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void uploadPhoto(f)
                    e.target.value = ''
                  }}
                />
                Upload photo
              </label>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {(data.photos ?? []).length === 0 && <li>No photos yet.</li>}
                {(data.photos ?? []).map((p) => (
                  <li key={p.id} className="rounded border border-border p-2">
                    {(p.description || 'Photo') + (p.source ? ` (${p.source})` : '')}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Documents
              </h2>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <select
                  id="doc-kind"
                  className="rounded border border-input bg-background px-2 py-1 text-sm"
                >
                  <option value="project_plan">Project plan</option>
                  <option value="agreement">Agreement</option>
                  <option value="email_export">Email export</option>
                  <option value="other">Other</option>
                </select>
                <label className="inline-flex cursor-pointer items-center rounded-md bg-secondary px-3 py-2 text-sm font-medium">
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      const sel = document.getElementById('doc-kind') as HTMLSelectElement
                      if (f) void uploadDoc(f, sel?.value || 'other')
                      e.target.value = ''
                    }}
                  />
                  Upload
                </label>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                Plain text and email exports can be summarized automatically; PDFs are stored for
                now.
              </p>
              <ul className="space-y-2 text-sm">
                {(data.documents ?? []).map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-border p-2"
                  >
                    <span>
                      [{d.kind}] {d.file_name}
                    </span>
                    {d.signed_url && (
                      <a
                        href={d.signed_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary underline"
                      >
                        Download
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Message screenshots
              </h2>
              <p className="mb-2 text-xs text-muted-foreground">
                Upload screenshots showing timestamps; we summarize threads for timeline context.
              </p>
              <label className="mb-2 inline-flex cursor-pointer items-center rounded-md bg-secondary px-3 py-2 text-sm font-medium">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void uploadShot(f, '')
                    e.target.value = ''
                  }}
                />
                Upload screenshot
              </label>
              <ul className="space-y-3 text-sm">
                {shotList.map((s) => (
                  <li key={s.id} className="rounded border border-border p-2">
                    {s.signed_url && (
                      <a
                        href={s.signed_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mb-1 block text-xs text-primary underline"
                      >
                        View image
                      </a>
                    )}
                    {s.caption_notes && (
                      <div className="text-xs text-muted-foreground">Note: {s.caption_notes}</div>
                    )}
                    <div className="mt-1 whitespace-pre-wrap text-xs">
                      {s.ai_thread_summary || '—'}
                    </div>
                  </li>
                ))}
                {shotList.length === 0 && <li className="text-muted-foreground">None yet.</li>}
              </ul>
            </section>
          </div>
        </div>
      )}

      {tab === 'events' && (
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <CalendarRange className="h-5 w-5" />
            <h2 className="text-lg font-medium">Event suggestions</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Uses your relationship zip (save under Context) plus interests and uploaded context.
            Requires <code className="rounded bg-muted px-1">EVENTBRITE_PRIVATE_TOKEN</code> on the
            server.
          </p>
          <button
            type="button"
            disabled={eventsLoading}
            onClick={() => void runEvents()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {eventsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Suggest events
          </button>
          {eventsResult != null && (
            <pre className="mt-4 max-h-[480px] overflow-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(eventsResult, null, 2)}
            </pre>
          )}
        </section>
      )}

      {tab === 'alignment' && (
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Target className="h-5 w-5" />
            <h2 className="text-lg font-medium">Alignment to your goals</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Compares this relationship to your active goals, weekly projects, and priorities.
          </p>
          <button
            type="button"
            disabled={alignLoading}
            onClick={() => void runAlignment()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {alignLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Analyze alignment
          </button>
          {alignResult != null && (
            <pre className="mt-4 max-h-[480px] overflow-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(alignResult, null, 2)}
            </pre>
          )}
        </section>
      )}

      {tab === 'messages' && (
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <h2 className="text-lg font-medium">Message framework</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Social invites, distinctive check-ins, shareable topics, and strategy questions —
            grounded in context you uploaded.
          </p>
          <button
            type="button"
            disabled={msgLoading}
            onClick={() => void runFramework()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {msgLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Generate framework pack
          </button>
          {msgOut && (
            <pre className="mt-4 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
              {msgOut}
            </pre>
          )}
        </section>
      )}

      {tab === 'context' && (
        <section className="mt-8 rounded-lg border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Timeline notes & interactions
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <ul className="space-y-2 text-sm">
              {(data.notes ?? []).map((n) => (
                <li key={n.id} className="rounded-md border border-border p-3">
                  {n.is_pinned && <span className="mr-2 text-xs text-primary">Pinned</span>}
                  {n.body}
                </li>
              ))}
              {(data.notes ?? []).length === 0 && (
                <li className="text-muted-foreground">No notes yet.</li>
              )}
            </ul>
            <ul className="space-y-2 text-sm">
              {(data.contactHistory ?? []).map((h) => (
                <li key={h.id} className="rounded-md border border-border p-3">
                  <span className="font-medium">{h.contact_type}</span>
                  <div className="text-xs text-muted-foreground">{h.created_at}</div>
                </li>
              ))}
              {(data.contactHistory ?? []).length === 0 && (
                <li className="text-muted-foreground">No history yet.</li>
              )}
            </ul>
          </div>
        </section>
      )}
    </div>
  )
}
