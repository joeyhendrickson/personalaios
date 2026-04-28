import type { SupabaseClient } from '@supabase/supabase-js'
import type { ScoreSignals, WeeklyReviewResult, WeeklyRiskAlert } from './types'
import { refreshScoresForPerson } from './refresh-scores'
import { RI } from './schema'

function impactScore(m: { friend_score: number; goal_score: number; trajectory_score: number }) {
  return m.goal_score * 0.45 + (1 - m.friend_score) * 0.25 + (1 - m.trajectory_score) * 0.3
}

function parseSignals(raw: unknown): ScoreSignals | null {
  if (!raw || typeof raw !== 'object') return null
  return raw as ScoreSignals
}

/**
 * Recomputes scores for all people, returns dashboard aggregates.
 */
export async function runWeeklyRelationshipReview(
  supabase: SupabaseClient,
  userId: string
): Promise<WeeklyReviewResult> {
  const { data: people, error: pErr } = await supabase
    .from(RI.people)
    .select('id, name, perceived_relationship_state')
    .eq('user_id', userId)

  if (pErr) throw new Error(pErr.message)

  const previousTrajectory: Record<string, number> = {}
  const { data: priorScores } = await supabase
    .from(RI.relationship_scores)
    .select('person_id, trajectory_score')
    .eq('user_id', userId)
  for (const row of priorScores ?? []) {
    previousTrajectory[row.person_id] = row.trajectory_score as number
  }

  let scoresUpdated = 0
  for (const p of people ?? []) {
    await refreshScoresForPerson(supabase, userId, p.id)
    scoresUpdated += 1
  }

  const { data: scored } = await supabase
    .from(RI.relationship_scores)
    .select('person_id, friend_score, goal_score, trajectory_score, signals')
    .eq('user_id', userId)

  const nameById = Object.fromEntries((people ?? []).map((x) => [x.id, x.name]))
  const stateById = Object.fromEntries(
    (people ?? []).map((x) => [x.id, x.perceived_relationship_state as string])
  )

  const merged = (scored ?? []).map((s) => ({
    person_id: s.person_id as string,
    name: nameById[s.person_id as string] ?? 'Unknown',
    friend_score: s.friend_score as number,
    goal_score: s.goal_score as number,
    trajectory_score: s.trajectory_score as number,
    signals: parseSignals(s.signals),
  }))

  const ninety = new Date(Date.now() - 90 * 86_400_000).toISOString()
  const { data: touches } = await supabase
    .from(RI.interactions)
    .select('person_id, interaction_at')
    .eq('user_id', userId)
    .gte('interaction_at', ninety)
    .order('interaction_at', { ascending: false })

  const lastTouchByPerson: Record<string, string> = {}
  for (const t of touches ?? []) {
    const pid = t.person_id as string
    if (!lastTouchByPerson[pid]) lastTouchByPerson[pid] = t.interaction_at as string
  }

  const now = Date.now()
  const riskAlerts: WeeklyRiskAlert[] = []

  for (const m of merged) {
    const last = lastTouchByPerson[m.person_id]
    const days = last ? (now - new Date(last).getTime()) / 86_400_000 : 999
    if (days > 21) {
      riskAlerts.push({
        person_id: m.person_id,
        name: m.name,
        code: 'drift',
        severity: days > 35 ? 'medium' : 'low',
        detail: `No logged interaction in ~${Math.floor(days)} days — relationship may be drifting on your side of the log.`,
      })
    }
    if (
      m.friend_score < 0.38 &&
      m.signals?.explanations?.friend?.some((x) => /reliability|trust|follow/i.test(x))
    ) {
      riskAlerts.push({
        person_id: m.person_id,
        name: m.name,
        code: 'reliability',
        severity: 'medium',
        detail: 'Friend score is low and your notes or tone tags flagged reliability themes.',
      })
    }
    if (stateById[m.person_id] === 'damaged' && m.trajectory_score < 0.45) {
      riskAlerts.push({
        person_id: m.person_id,
        name: m.name,
        code: 'misalignment',
        severity: 'medium',
        detail:
          'Marked "damaged" and trajectory is soft — good week for careful repair or clarity.',
      })
    }
  }

  const topRelationships = [...merged]
    .map((m) => ({
      person_id: m.person_id,
      name: m.name,
      friend_score: m.friend_score,
      goal_score: m.goal_score,
      trajectory_score: m.trajectory_score,
      impact_hint:
        m.goal_score > 0.55
          ? 'High goal relevance in what you logged.'
          : m.trajectory_score < 0.42
            ? 'Cadence cooling — re-engagement window.'
            : 'Steady — maintain rhythm.',
    }))
    .sort((a, b) => b.friend_score + b.goal_score * 0.5 - (a.friend_score + a.goal_score * 0.5))
    .slice(0, 20)

  const trajectoryDeltas = merged.map((m) => ({
    ...m,
    prev: previousTrajectory[m.person_id],
    delta:
      previousTrajectory[m.person_id] === undefined
        ? 0
        : m.trajectory_score - previousTrajectory[m.person_id]!,
  }))

  const trajectoryUp = [...trajectoryDeltas]
    .filter((x) => x.delta > 0.05)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 10)
    .map(({ person_id, name, trajectory_score }) => ({ person_id, name, trajectory_score }))

  const trajectoryDown = [...trajectoryDeltas]
    .filter((x) => x.delta < -0.05)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 10)
    .map(({ person_id, name, trajectory_score }) => ({ person_id, name, trajectory_score }))

  const suggestedOutreach = [...merged]
    .filter((m) => m.trajectory_score < 0.48 || m.friend_score < 0.42 || m.goal_score > 0.55)
    .map((m) => ({
      person_id: m.person_id,
      name: m.name,
      reason:
        m.goal_score > 0.58
          ? 'Strong goal mapping — worth a focused, low-pressure advance on shared work.'
          : m.trajectory_score < 0.45
            ? 'Trajectory cooling — small re-engagement or clarity move fits the data.'
            : 'Friend score modest — light touch maintenance could compound.',
      impact_score: round2(impactScore(m)),
    }))
    .sort((a, b) => b.impact_score - a.impact_score)
    .slice(0, 15)

  const { data: activeGoals } = await supabase
    .from('goals')
    .select('id, title')
    .eq('user_id', userId)
    .eq('status', 'active')

  const goalIds = (activeGoals ?? []).map((g) => g.id as string)
  let goalOpportunities: WeeklyReviewResult['goalOpportunities'] = []

  if (goalIds.length > 0) {
    const { data: links } = await supabase
      .from(RI.person_goal_links)
      .select('goal_id, person_id, link_type, strength, evidence')
      .eq('user_id', userId)
      .in('goal_id', goalIds)

    type GoalPeopleRow = WeeklyReviewResult['goalOpportunities'][number]['people'][number]
    const byGoal: Record<string, GoalPeopleRow[]> = {}
    for (const g of activeGoals ?? []) {
      byGoal[g.id as string] = []
    }
    for (const row of links ?? []) {
      const gid = row.goal_id as string
      if (!byGoal[gid]) continue
      byGoal[gid].push({
        person_id: row.person_id as string,
        name: nameById[row.person_id as string] ?? 'Unknown',
        link_type: row.link_type as string,
        strength: row.strength as number,
        evidence: (row.evidence as string) ?? null,
      })
    }
    goalOpportunities = (activeGoals ?? []).map((g) => ({
      goal_id: g.id as string,
      goal_title: g.title as string,
      people: (byGoal[g.id as string] ?? []).sort((a, b) => b.strength - a.strength),
    }))
  }

  return {
    scoresUpdated,
    topRelationships,
    trajectoryUp,
    trajectoryDown,
    riskAlerts: dedupeRisks(riskAlerts),
    goalOpportunities,
    suggestedOutreach,
    previousTrajectoryByPerson: previousTrajectory,
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function dedupeRisks(alerts: WeeklyRiskAlert[]): WeeklyRiskAlert[] {
  const key = (a: WeeklyRiskAlert) => `${a.person_id}:${a.code}`
  const seen = new Set<string>()
  return alerts.filter((a) => {
    const k = key(a)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}
