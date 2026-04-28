'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import {
  SuggestedNextMoveCard,
  type SuggestedNextMove,
} from '@/components/relationship-intel/suggested-next-move-card'

interface GoalOption {
  id: string
  title: string
  category?: string | null
}

export default function RelationshipIntelPersonPage() {
  const params = useParams()
  const personId = params.personId as string

  const [person, setPerson] = useState<{
    id: string
    name: string
    notes: string | null
    perceived_relationship_state: string
  } | null>(null)
  const [interactions, setInteractions] = useState<
    { id: string; type: string; content: string; interaction_at: string; extraction?: unknown }[]
  >([])
  const [profile, setProfile] = useState<{
    identity: { name: string; notes: string | null }
    relationship_state: string
    interaction_count: number
    extracted: {
      topics_discussed: string[]
      shared_experience_snippets: string[]
      behavioral_traits_from_notes: string[]
      tone_summary: string
    }
  } | null>(null)
  const [scores, setScores] = useState<{
    friend_score: number
    goal_score: number
    trajectory_score: number
    signals: unknown
  } | null>(null)
  const [goalLinks, setGoalLinks] = useState<
    {
      goal_id: string
      link_type: string
      strength: number
      evidence: string | null
      goal: GoalOption | null
    }[]
  >([])
  const [goals, setGoals] = useState<GoalOption[]>([])
  const [loading, setLoading] = useState(true)
  const [notesDraft, setNotesDraft] = useState('')
  const [msgType, setMsgType] = useState<'message' | 'call' | 'hangout' | 'project' | 'other'>(
    'message'
  )
  const [msgBody, setMsgBody] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [move, setMove] = useState<SuggestedNextMove | null>(null)
  const [moveLoading, setMoveLoading] = useState(false)
  const [moveError, setMoveError] = useState<string | null>(null)

  const [glGoal, setGlGoal] = useState('')
  const [glType, setGlType] = useState<'advisor' | 'collaborator' | 'potential' | 'none'>(
    'collaborator'
  )
  const [glStrength, setGlStrength] = useState(0.6)
  const [glEvidence, setGlEvidence] = useState('')

  const [growthPlan, setGrowthPlan] = useState<{
    deepen_connection: string[]
    align_on_goals: string[]
  } | null>(null)
  const [growthLoading, setGrowthLoading] = useState(false)

  const load = useCallback(() => {
    if (!personId) return
    setLoading(true)
    Promise.all([
      fetch(`/api/relationships/${personId}`).then((r) => r.json()),
      fetch('/api/goals').then((r) => r.json()),
    ])
      .then(([detail, g]) => {
        if (detail.error) {
          setError(detail.error)
          setPerson(null)
        } else {
          setError(null)
          setPerson(detail.person)
          setNotesDraft(detail.person?.notes ?? '')
          setInteractions(detail.interactions ?? [])
          setScores(detail.scores)
          setGoalLinks(detail.goalLinks ?? [])
          setProfile(detail.profile ?? null)
        }
        if (!g.error && Array.isArray(g.goals)) {
          setGoals(
            g.goals.map((x: { id: string; title: string; category?: string }) => ({
              id: x.id,
              title: x.title,
              category: x.category,
            }))
          )
        }
      })
      .finally(() => setLoading(false))
  }, [personId])

  useEffect(() => {
    load()
  }, [load])

  const saveNotes = () => {
    fetch(`/api/relationships/${personId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: notesDraft }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setError(typeof j.error === 'string' ? j.error : 'Save failed')
        else load()
      })
  }

  const saveState = (state: string) => {
    fetch(`/api/relationships/${personId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ perceived_relationship_state: state }),
    }).then(() => load())
  }

  const addInteraction = (e: React.FormEvent) => {
    e.preventDefault()
    if (!msgBody.trim()) return
    fetch(`/api/relationships/${personId}/interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: msgType, content: msgBody }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setError(typeof j.error === 'string' ? j.error : 'Failed')
        else {
          setMsgBody('')
          load()
        }
      })
  }

  const addGoalLink = (e: React.FormEvent) => {
    e.preventDefault()
    if (!glGoal) return
    fetch(`/api/relationships/${personId}/goal-links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal_id: glGoal,
        link_type: glType,
        strength: glStrength,
        evidence: glEvidence || undefined,
      }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setError(typeof j.error === 'string' ? j.error : 'Link failed')
        else {
          setGlEvidence('')
          load()
        }
      })
  }

  const requestGrowthPlan = () => {
    setGrowthLoading(true)
    fetch(`/api/relationships/${personId}/growth-plan`, { method: 'POST' })
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setError(typeof j.error === 'string' ? j.error : 'Growth plan failed')
        else setGrowthPlan(j.growth_plan ?? null)
      })
      .finally(() => setGrowthLoading(false))
  }

  const requestMove = () => {
    setMoveLoading(true)
    setMoveError(null)
    fetch(`/api/relationships/${personId}/next-move`, { method: 'POST' })
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setMoveError(j.error)
        else setMove(j.suggested_next_move ?? null)
      })
      .finally(() => setMoveLoading(false))
  }

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>
  }

  if (!person) {
    return (
      <div className="p-8">
        <p className="text-destructive">{error ?? 'Not found'}</p>
        <Link href="/modules/relationship-intel" className="mt-4 inline-block text-sm underline">
          Back
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <Link
        href="/modules/relationship-intel"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All people
      </Link>

      <header>
        <h1 className="text-2xl font-semibold">{person.name}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          {(['clean', 'neutral', 'damaged'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => saveState(s)}
              className={`rounded-full border px-3 py-1 text-xs capitalize ${
                person.perceived_relationship_state === s
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      {profile ? (
        <section className="rounded-xl border border-border bg-card p-4 text-sm">
          <h2 className="mb-2 font-semibold">Person intelligence (from your data)</h2>
          <p className="mb-2 text-xs text-muted-foreground">{profile.extracted.tone_summary}</p>
          {profile.extracted.topics_discussed.length > 0 ? (
            <div className="mb-2">
              <p className="text-xs font-medium text-muted-foreground">Topics (from extractions)</p>
              <p className="text-sm">{profile.extracted.topics_discussed.join(' · ')}</p>
            </div>
          ) : null}
          {profile.extracted.shared_experience_snippets.length > 0 ? (
            <div className="mb-2">
              <p className="text-xs font-medium text-muted-foreground">
                Shared experience quotes (verbatim)
              </p>
              <ul className="list-inside list-disc text-xs text-muted-foreground">
                {profile.extracted.shared_experience_snippets.slice(0, 8).map((s, i) => (
                  <li key={i} className="italic">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {profile.extracted.behavioral_traits_from_notes.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Traits from your note bullets
              </p>
              <ul className="list-inside list-disc text-xs">
                {profile.extracted.behavioral_traits_from_notes.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Relationship growth plan</h2>
          <button
            type="button"
            disabled={growthLoading}
            onClick={requestGrowthPlan}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/50 disabled:opacity-50"
          >
            {growthLoading ? 'Generating…' : 'Generate'}
          </button>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Ways to deepen connection and align on goals — grounded in this profile and logs only.
        </p>
        {growthPlan ? (
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Deepen connection</p>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                {growthPlan.deepen_connection.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Align on goals</p>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                {growthPlan.align_on_goals.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Run generate after you have notes or pasted messages.
          </p>
        )}
      </section>

      {scores ? (
        <section className="rounded-xl border border-border bg-card p-4 text-sm">
          <h2 className="mb-2 font-semibold">Scores (0–100)</h2>
          <p className="text-muted-foreground">
            Friend {(scores.friend_score * 100).toFixed(1)} · Goal{' '}
            {(scores.goal_score * 100).toFixed(1)} · Trajectory{' '}
            {(scores.trajectory_score * 100).toFixed(1)}
          </p>
          <details className="mt-2 text-xs text-muted-foreground">
            <summary className="cursor-pointer">Signal breakdown</summary>
            <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted/40 p-2">
              {JSON.stringify(scores.signals, null, 2)}
            </pre>
          </details>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          No scores yet — add interactions or run weekly review from the list page.
        </p>
      )}

      <SuggestedNextMoveCard
        move={move}
        loading={moveLoading}
        error={moveError}
        onRequest={requestMove}
      />

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-2 font-semibold">Your notes</h2>
        <p className="mb-2 text-xs text-muted-foreground">
          Only facts you type here are used as grounding alongside messages.
        </p>
        <textarea
          className="mb-2 min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
        />
        <button
          type="button"
          onClick={saveNotes}
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
        >
          Save notes
        </button>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-2 font-semibold">Paste messages or log an interaction</h2>
        <form onSubmit={addInteraction} className="space-y-2">
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={msgType}
            onChange={(e) => setMsgType(e.target.value as typeof msgType)}
          >
            <option value="message">message</option>
            <option value="call">call</option>
            <option value="hangout">hangout</option>
            <option value="project">project</option>
            <option value="other">other</option>
          </select>
          <textarea
            required
            className="min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Paste a thread or describe what happened — stay factual."
            value={msgBody}
            onChange={(e) => setMsgBody(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
          >
            Add interaction
          </button>
        </form>
        <ul className="mt-4 max-h-64 space-y-2 overflow-auto text-sm">
          {interactions.map((i) => (
            <li key={i.id} className="rounded-md border border-border/60 p-2">
              <span className="text-xs text-muted-foreground">
                {i.type} · {new Date(i.interaction_at).toLocaleString()}
              </span>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">{i.content}</p>
              {i.extraction &&
              typeof i.extraction === 'object' &&
              Object.keys(i.extraction as object).length > 0 ? (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-muted-foreground">
                    Parsed signals (evidence-based)
                  </summary>
                  <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted/40 p-2">
                    {JSON.stringify(i.extraction, null, 2)}
                  </pre>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-2 font-semibold">Link a Lifestacks goal</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Ties goal score to explicit evidence you write — keeps the model honest.
        </p>
        <form
          onSubmit={addGoalLink}
          className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
        >
          <select
            className="min-w-[200px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={glGoal}
            onChange={(e) => setGlGoal(e.target.value)}
          >
            <option value="">Select goal…</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={glType}
            onChange={(e) => setGlType(e.target.value as typeof glType)}
          >
            <option value="advisor">advisor</option>
            <option value="collaborator">collaborator</option>
            <option value="potential">potential</option>
            <option value="none">none</option>
          </select>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            strength
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={glStrength}
              onChange={(e) => setGlStrength(Number(e.target.value))}
            />
            {glStrength.toFixed(2)}
          </label>
          <input
            className="min-w-[200px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Evidence (why this link is real)"
            value={glEvidence}
            onChange={(e) => setGlEvidence(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/50"
          >
            Save link
          </button>
        </form>
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          {goalLinks.map((l) => (
            <li key={l.goal_id}>
              <span className="font-medium text-foreground">{l.goal?.title ?? l.goal_id}</span> —{' '}
              {l.link_type} ({(l.strength * 100).toFixed(0)}%){l.evidence ? ` · ${l.evidence}` : ''}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
