'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw } from 'lucide-react'

interface PersonListItem {
  id: string
  name: string
  perceived_relationship_state: string
  scores: {
    friend_score: number
    goal_score: number
    trajectory_score: number
  } | null
}

interface WeeklyReport {
  scoresUpdated: number
  topRelationships: Array<{
    person_id: string
    name: string
    friend_score: number
    goal_score: number
    trajectory_score: number
    impact_hint?: string
  }>
  trajectoryUp: { person_id: string; name: string; trajectory_score: number }[]
  trajectoryDown: { person_id: string; name: string; trajectory_score: number }[]
  riskAlerts: Array<{
    person_id: string
    name: string
    code: string
    severity: string
    detail: string
  }>
  goalOpportunities: Array<{
    goal_id: string
    goal_title: string
    people: Array<{
      person_id: string
      name: string
      link_type: string
      strength: number
      evidence: string | null
    }>
  }>
  suggestedOutreach: Array<{
    person_id: string
    name: string
    reason: string
    impact_score: number
  }>
}

export default function RelationshipIntelDashboardPage() {
  const [people, setPeople] = useState<PersonListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null)
  const [weeklyLoading, setWeeklyLoading] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/relationships')
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setError(j.error)
        else {
          setError(null)
          setPeople(j.people ?? [])
        }
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const runWeekly = () => {
    setWeeklyLoading(true)
    fetch('/api/relationships/weekly-review', { method: 'POST' })
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setError(j.error)
        else {
          setError(null)
          setWeekly(j)
          load()
        }
      })
      .finally(() => setWeeklyLoading(false))
  }

  const createPerson = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    fetch('/api/relationships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setError(typeof j.error === 'string' ? j.error : 'Could not create')
        else {
          setName('')
          setError(null)
          load()
        }
      })
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Link
        href="/modules"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Modules
      </Link>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Relationship Intel</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Grounded next moves from your own messages and notes — no external sync in this MVP.
          </p>
        </div>
        <button
          type="button"
          onClick={runWeekly}
          disabled={weeklyLoading}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/60 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${weeklyLoading ? 'animate-spin' : ''}`} />
          Weekly review
        </button>
      </div>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <form
        onSubmit={createPerson}
        className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <input
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="New person name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Add person
        </button>
      </form>

      {weekly ? (
        <section className="mb-10 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Last weekly review</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Scores updated: {weekly.scoresUpdated}
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                Top relationships
              </h3>
              <ul className="space-y-2 text-sm">
                {weekly.topRelationships.slice(0, 8).map((r) => (
                  <li key={r.person_id} className="flex flex-col gap-0.5">
                    <div className="flex justify-between gap-2">
                      <Link
                        href={`/modules/relationship-intel/${r.person_id}`}
                        className="truncate hover:underline"
                      >
                        {r.name}
                      </Link>
                      <span className="shrink-0 text-muted-foreground">
                        F {(r.friend_score * 100).toFixed(0)} / G {(r.goal_score * 100).toFixed(0)}
                      </span>
                    </div>
                    {r.impact_hint ? (
                      <p className="text-xs text-muted-foreground">{r.impact_hint}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                Suggested outreach
              </h3>
              <ul className="space-y-2 text-sm">
                {weekly.suggestedOutreach.slice(0, 6).map((r) => (
                  <li key={r.person_id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <Link
                        href={`/modules/relationship-intel/${r.person_id}`}
                        className="font-medium hover:underline"
                      >
                        {r.name}
                      </Link>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        impact {r.impact_score?.toFixed(2) ?? '—'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {(weekly.riskAlerts ?? []).length > 0 ? (
            <div className="mt-4 border-t border-border pt-4">
              <h3 className="mb-2 text-xs font-medium uppercase text-destructive">Risk alerts</h3>
              <ul className="space-y-2 text-sm">
                {(weekly.riskAlerts ?? []).slice(0, 12).map((a, idx) => (
                  <li key={`${a.person_id}-${a.code}-${idx}`}>
                    <Link
                      href={`/modules/relationship-intel/${a.person_id}`}
                      className="font-medium hover:underline"
                    >
                      {a.name}
                    </Link>
                    <span className="ml-2 text-xs uppercase text-muted-foreground">{a.code}</span>
                    <p className="text-xs text-muted-foreground">{a.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {(weekly.goalOpportunities ?? []).some((g) => g.people.length > 0) ? (
            <div className="mt-4 border-t border-border pt-4">
              <h3 className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                Goal opportunities
              </h3>
              <ul className="space-y-3 text-sm">
                {(weekly.goalOpportunities ?? [])
                  .filter((g) => g.people.length > 0)
                  .map((g) => (
                    <li key={g.goal_id}>
                      <p className="font-medium">{g.goal_title}</p>
                      <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                        {g.people.slice(0, 5).map((p) => (
                          <li key={p.person_id}>
                            <Link
                              href={`/modules/relationship-intel/${p.person_id}`}
                              className="hover:underline"
                            >
                              {p.name}
                            </Link>{' '}
                            · {p.link_type} · strength {(p.strength * 100).toFixed(0)}%
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
          {(weekly.trajectoryDown.length > 0 || weekly.trajectoryUp.length > 0) && (
            <div className="mt-4 grid gap-4 border-t border-border pt-4 md:grid-cols-2">
              <div>
                <h3 className="mb-2 text-xs font-medium text-emerald-600">Trajectory up</h3>
                <ul className="text-sm text-muted-foreground">
                  {weekly.trajectoryUp.map((r) => (
                    <li key={r.person_id}>
                      <Link
                        href={`/modules/relationship-intel/${r.person_id}`}
                        className="hover:underline"
                      >
                        {r.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-xs font-medium text-amber-700">Trajectory softening</h3>
                <ul className="text-sm text-muted-foreground">
                  {weekly.trajectoryDown.map((r) => (
                    <li key={r.person_id}>
                      <Link
                        href={`/modules/relationship-intel/${r.person_id}`}
                        className="hover:underline"
                      >
                        {r.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold">People</h2>
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
        {!loading && people.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No people yet. Add someone you want clearer moves with.
          </p>
        ) : null}
        <ul className="divide-y divide-border rounded-xl border border-border">
          {people.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <Link
                href={`/modules/relationship-intel/${p.id}`}
                className="font-medium hover:underline"
              >
                {p.name}
              </Link>
              <div className="text-right text-xs text-muted-foreground">
                {p.scores ? (
                  <>
                    friend {(p.scores.friend_score * 100).toFixed(0)} · goal{' '}
                    {(p.scores.goal_score * 100).toFixed(0)} · traj{' '}
                    {(p.scores.trajectory_score * 100).toFixed(0)}
                  </>
                ) : (
                  'no scores yet'
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
