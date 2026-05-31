'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Heart,
  Plus,
  Loader2,
  Sparkles,
  MapPin,
  ExternalLink,
  Clock,
  Star,
  Users,
} from 'lucide-react'

const MODULE_ID = 'dating-manager'

type ProspectListItem = {
  id: string
  name: string
  status: string
  zip_code?: string | null
  positive_qualities?: string | null
  toxic_qualities?: string | null
  attractiveness_score?: number | null
  updated_at: string
}

type Criteria = {
  summary?: string
  criteria?: {
    core_needs?: string[]
    supportive_traits?: string[]
    watch_outs?: string[]
    lifestyle_fit?: string[]
  }
  generated_at?: string
}

type DateIdea = {
  externalId: string
  title: string
  description?: string
  whenText?: string
  url?: string
  venueName?: string
  address?: string
  raw?: { thumbnail?: string; image?: string }
}

type OverallSummary = {
  result?: {
    summary?: string
    ranking?: { prospect_id: string; name: string; fit_score: number; one_line: string }[]
    patterns?: string[]
    recommendation?: string
    watch_outs?: string[]
  }
  created_at?: string
}

type Tab = 'prospects' | 'criteria' | 'ideas' | 'summary'

export default function DatingManagerPage() {
  const [tab, setTab] = useState<Tab>('prospects')

  useEffect(() => {
    void fetch('/api/modules/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleId: MODULE_ID }),
    }).catch(() => {})
  }, [])

  const tabBtn = (k: Tab, label: string) => (
    <button
      type="button"
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
        href="/modules"
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Life Hacks
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Heart className="h-6 w-6 text-rose-500" />
          Dating Management
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {tabBtn('prospects', 'Prospects')}
          {tabBtn('criteria', 'What I need')}
          {tabBtn('ideas', 'Date ideas')}
          {tabBtn('summary', 'Summary')}
        </div>
      </div>

      {tab === 'prospects' && <ProspectsTab />}
      {tab === 'criteria' && <CriteriaTab />}
      {tab === 'ideas' && <DateIdeasTab />}
      {tab === 'summary' && <SummaryTab />}
    </div>
  )
}

function ProspectsTab() {
  const [prospects, setProspects] = useState<ProspectListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [zip, setZip] = useState('')
  const [howWeMet, setHowWeMet] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dating-manager/prospects')
      const json = await res.json()
      setProspects(json.prospects ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const addProspect = async () => {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/dating-manager/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          zip_code: zip.trim() || undefined,
          how_we_met: howWeMet.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'Could not add prospect')
        return
      }
      setName('')
      setZip('')
      setHowWeMet('')
      setShowAdd(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Add potential partners as cards. Open a card to add qualities, photos, and get an AI
          evaluation.
        </p>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      {showAdd && (
        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="Zip code (for date ideas)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:max-w-[200px]"
            />
            <input
              value={howWeMet}
              onChange={(e) => setHowWeMet(e.target.value)}
              placeholder="How you met (optional)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addProspect}
              disabled={saving || !name.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save prospect
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : prospects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <Users className="mx-auto mb-2 h-6 w-6" />
          No prospects yet. Add someone to start evaluating.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {prospects.map((p) => (
            <Link
              key={p.id}
              href={`/modules/dating-manager/${p.id}`}
              className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-rose-300"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium break-words">{p.name}</h3>
                {typeof p.attractiveness_score === 'number' && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                    <Star className="h-3 w-3" />
                    {p.attractiveness_score}
                  </span>
                )}
              </div>
              {p.zip_code && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {p.zip_code}
                </p>
              )}
              {p.positive_qualities && (
                <p className="mt-2 line-clamp-2 text-sm text-foreground/80">
                  {p.positive_qualities}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

function CriteriaTab() {
  const [criteria, setCriteria] = useState<Criteria | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/dating-manager/criteria')
        const json = await res.json()
        setCriteria(json.criteria ?? null)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const generate = async () => {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/dating-manager/criteria', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'Could not generate criteria')
        return
      }
      setCriteria(json.criteria)
    } finally {
      setGenerating(false)
    }
  }

  const list = (label: string, items?: string[]) =>
    items && items.length > 0 ? (
      <div>
        <h4 className="text-sm font-semibold text-foreground">{label}</h4>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-foreground/80">
          {items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      </div>
    ) : null

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-rose-500" />
        <h2 className="text-lg font-medium">What you need in a partner</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Inferred from your goals, projects, priorities, and habits — what genuinely supports the
        life you&apos;re building.
      </p>
      <button
        type="button"
        onClick={generate}
        disabled={generating}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {generating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {criteria ? 'Regenerate' : 'Generate from my goals'}
      </button>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : criteria ? (
        <div className="space-y-4">
          {criteria.summary && <p className="text-sm text-foreground/90">{criteria.summary}</p>}
          {list('Core needs', criteria.criteria?.core_needs)}
          {list('Supportive traits', criteria.criteria?.supportive_traits)}
          {list('Watch-outs', criteria.criteria?.watch_outs)}
          {list('Lifestyle fit', criteria.criteria?.lifestyle_fit)}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No criteria yet. Generate it to anchor your evaluations.
        </p>
      )}
    </section>
  )
}

function DateIdeasTab() {
  const [zip, setZip] = useState('')
  const [category, setCategory] = useState('restaurants')
  const [ideas, setIdeas] = useState<DateIdea[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const search = async () => {
    if (!zip.trim()) return
    setLoading(true)
    setError('')
    setIdeas(null)
    try {
      const res = await fetch('/api/dating-manager/date-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zip_code: zip.trim(), category }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.hint || json?.error || 'Search failed')
        return
      }
      setIdeas(json.ideas ?? [])
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-rose-500" />
        <h2 className="text-lg font-medium">Date ideas near you</h2>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <input
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          placeholder="Zip code"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:max-w-[160px]"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:max-w-[200px]"
        >
          <option value="restaurants">Restaurants</option>
          <option value="coffee">Coffee shops</option>
          <option value="bars">Bars</option>
          <option value="activities">Activities</option>
          <option value="events">Events</option>
          <option value="movies">Movies</option>
        </select>
        <button
          type="button"
          onClick={search}
          disabled={loading || !zip.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Find ideas
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {ideas != null &&
        (ideas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No ideas found. Try another category or zip.
          </p>
        ) : (
          <div className="grid gap-3">
            {ideas.map((ev) => {
              const img = ev.raw?.image || ev.raw?.thumbnail
              const where = ev.venueName || ev.address
              return (
                <div
                  key={ev.externalId}
                  className="flex gap-3 rounded-lg border border-border bg-background p-3"
                >
                  {img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="h-20 w-20 shrink-0 rounded-md object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium break-words">{ev.title}</h3>
                    {ev.whenText && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span className="break-words">{ev.whenText}</span>
                      </p>
                    )}
                    {where && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="break-words">{where}</span>
                      </p>
                    )}
                    {ev.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-foreground/80">
                        {ev.description}
                      </p>
                    )}
                    {ev.url && (
                      <a
                        href={ev.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        View <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
    </section>
  )
}

function SummaryTab() {
  const [summary, setSummary] = useState<OverallSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/dating-manager/summary')
        const json = await res.json()
        setSummary(json.summary ?? null)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const generate = async () => {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/dating-manager/summary', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'Could not generate summary')
        return
      }
      setSummary(json.summary)
    } finally {
      setGenerating(false)
    }
  }

  const r = summary?.result

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-rose-500" />
        <h2 className="text-lg font-medium">Overall evaluation</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Compares all your active prospects against each other and your partner criteria.
      </p>
      <button
        type="button"
        onClick={generate}
        disabled={generating}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {generating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {summary ? 'Regenerate comparison' : 'Generate comparison'}
      </button>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : r ? (
        <div className="space-y-4">
          {r.summary && <p className="text-sm text-foreground/90">{r.summary}</p>}
          {r.ranking && r.ranking.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Ranking</h4>
              {r.ranking.map((row, i) => (
                <div
                  key={row.prospect_id || i}
                  className="flex items-start justify-between gap-2 rounded-md border border-border bg-background p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {i + 1}. {row.name}
                    </p>
                    <p className="text-sm text-muted-foreground">{row.one_line}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                    {row.fit_score}
                  </span>
                </div>
              ))}
            </div>
          )}
          {r.patterns && r.patterns.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold">Patterns</h4>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-foreground/80">
                {r.patterns.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          {r.recommendation && (
            <div className="rounded-md bg-rose-50 p-3 text-sm text-rose-900">
              {r.recommendation}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No comparison yet. Add prospects, then generate.
        </p>
      )}
    </section>
  )
}
