import type {
  InteractionExtraction,
  InteractionRow,
  PerceivedRelationshipState,
  PersonGoalLinkRow,
  ScoreSignals,
} from './types'

const MS_DAY = 86_400_000

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / MS_DAY
}

function parseExtraction(row: InteractionRow): InteractionExtraction | null {
  const e = row.extraction
  if (!e || typeof e !== 'object' || !('emotional_tone' in e)) return null
  return e as InteractionExtraction
}

function parseNoteReliabilitySignals(notes: string | null): { reliabilityAdj: number } {
  if (!notes?.trim()) return { reliabilityAdj: 0 }
  let reliabilityAdj = 0
  if (/(dependable|reliable|follows?\s+through|keeps?\s+commitments)/i.test(notes))
    reliabilityAdj += 0.12
  if (/(flake|unreliable|ghosted|didn'?t\s+follow|broke\s+trust|lack\s+of\s+follow)/i.test(notes))
    reliabilityAdj -= 0.18
  return { reliabilityAdj }
}

function countGoalTitleMentions(interactions: InteractionRow[], goalTitles: string[]): number {
  if (goalTitles.length === 0) return 0
  const msgBodies = interactions
    .filter((i) => i.type === 'message')
    .map((i) => i.content.toLowerCase())
  let hits = 0
  for (const title of goalTitles) {
    const q = title.trim().toLowerCase()
    if (q.length < 3) continue
    for (const body of msgBodies) {
      if (body.includes(q)) hits++
    }
  }
  return hits
}

export interface ComputeScoresInput {
  interactions: InteractionRow[]
  notes: string | null
  perceivedState: PerceivedRelationshipState
  goalLinks: Pick<PersonGoalLinkRow, 'strength' | 'link_type'>[]
  goalTitlesForMention: string[]
  now?: Date
}

export interface ComputedScores {
  friend_score: number
  goal_score: number
  trajectory_score: number
  signals: ScoreSignals
}

/**
 * Deterministic scores (0–1) with human-readable explanation lines.
 * Uses interactions (including optional extraction JSON), notes, and goal links only.
 */
export function computeRelationshipScores(input: ComputeScoresInput): ComputedScores {
  const now = input.now ?? new Date()
  const cutoff = new Date(now.getTime() - 28 * MS_DAY)

  const recent = input.interactions.filter((i) => new Date(i.interaction_at) >= cutoff)
  const sorted = [...recent].sort(
    (a, b) => new Date(a.interaction_at).getTime() - new Date(b.interaction_at).getTime()
  )

  const mid = new Date(now.getTime() - 14 * MS_DAY)
  const priorWindow = sorted.filter((i) => {
    const d = new Date(i.interaction_at)
    return d >= cutoff && d < mid
  })
  const recentWindow = sorted.filter((i) => new Date(i.interaction_at) >= mid)

  const messageChars = recent
    .filter((i) => i.type === 'message')
    .reduce((acc, i) => acc + i.content.length, 0)

  const hangouts = recent.filter((i) => i.type === 'hangout').length
  const projects = recent.filter((i) => i.type === 'project').length

  const consistency = Math.min(1, recent.length / 8)
  const interactionDepth = Math.min(1, messageChars / 3500)
  const sharedExperiences = Math.min(1, (hangouts + projects) / 4)

  let selfCommits = 0
  let themCommits = 0
  let alignmentHits = 0
  let negativeRecent = 0
  const lastFive = sorted.slice(-5)
  for (const row of recent) {
    const ex = parseExtraction(row)
    if (!ex) continue
    alignmentHits += ex.alignment_signals.length
    for (const c of ex.commitments) {
      if (c.party === 'self') selfCommits++
      else if (c.party === 'them') themCommits++
    }
  }
  for (const row of lastFive) {
    const ex = parseExtraction(row)
    if (ex?.emotional_tone === 'negative') negativeRecent++
  }

  let reciprocity = 0.45
  const totalC = selfCommits + themCommits
  if (totalC > 0) {
    reciprocity = Math.min(1, (2 * Math.min(selfCommits, themCommits)) / Math.max(totalC, 1))
  } else if (recent.length >= 4) {
    reciprocity = Math.min(1, 0.35 + consistency * 0.4)
  }

  const lastAt =
    sorted.length > 0
      ? new Date(sorted[sorted.length - 1]!.interaction_at)
      : new Date(now.getTime() - 60 * MS_DAY)
  const daysSince = daysBetween(now, lastAt)
  let reliability = Math.max(0, Math.min(1, 1 - Math.min(1, daysSince / 28)))

  const noteSignals = parseNoteReliabilitySignals(input.notes)
  reliability = Math.max(0, Math.min(1, reliability + noteSignals.reliabilityAdj))
  if (negativeRecent >= 2) reliability = Math.max(0, reliability - 0.08)

  let friend =
    consistency * 0.22 +
    reciprocity * 0.14 +
    interactionDepth * 0.16 +
    sharedExperiences * 0.2 +
    reliability * 0.28

  if (input.perceivedState === 'damaged') friend *= 0.82
  if (input.perceivedState === 'clean') friend = Math.min(1, friend * 1.04)

  const linkStrengths = input.goalLinks.filter((l) => l.link_type !== 'none').map((l) => l.strength)
  const linkAvg =
    linkStrengths.length > 0 ? linkStrengths.reduce((a, b) => a + b, 0) / linkStrengths.length : 0
  const mentions = countGoalTitleMentions(recent, input.goalTitlesForMention)
  const titleMentionsSignal = Math.min(1, mentions / 3)
  const collaborationSignals = Math.min(1, alignmentHits / 10 + projects * 0.15)

  let goal_score = Math.min(
    1,
    linkAvg * 0.65 +
      titleMentionsSignal * 0.22 +
      collaborationSignals * 0.2 +
      (input.goalLinks.length > 0 ? 0.05 : 0)
  )
  if (input.goalLinks.length === 0 && mentions === 0 && alignmentHits === 0) {
    goal_score = Math.min(goal_score, 0.35)
  }

  const a = priorWindow.length
  const b = recentWindow.length
  const trendRatio = b / Math.max(1, a)
  let trajectory = 0.5 + (trendRatio - 1) * 0.35
  trajectory = Math.max(0, Math.min(1, trajectory))
  if (input.perceivedState === 'damaged' && b < a) trajectory = Math.max(0, trajectory - 0.08)

  const friendExpl: string[] = []
  const goalExpl: string[] = []
  const trajExpl: string[] = []

  if (daysSince > 21)
    friendExpl.push('↓ Friend score: no logged touchpoints in ~3+ weeks (recency).')
  else if (daysSince > 14)
    friendExpl.push('Friend score: cadence is thinning based on last logged interaction date.')

  if (noteSignals.reliabilityAdj < 0) {
    friendExpl.push(
      'Friend / reliability: your notes flag trust or follow-through concerns (explicit wording).'
    )
  } else if (noteSignals.reliabilityAdj > 0) {
    friendExpl.push('↑ Reliability note: your notes highlight dependability (explicit wording).')
  }

  if (negativeRecent >= 2) {
    friendExpl.push(
      'Friend score: last few uploads lean negative in extracted tone (from your message text only).'
    )
  }

  if (totalC >= 2) {
    friendExpl.push(
      `Reciprocity signal: logged commitments — you: ${selfCommits}, them: ${themCommits} (parsed quotes only).`
    )
  }

  if (sharedExperiences >= 0.35) {
    friendExpl.push('↑ Shared experiences: hangouts/projects logged in-window.')
  }

  if (friendExpl.length === 0) {
    friendExpl.push(
      'Friend score driven mainly by consistency, depth, and recency of what you logged.'
    )
  }

  if (input.goalLinks.length === 0 && mentions === 0) {
    goalExpl.push('Goal score capped: no linked goals and no goal-title mentions in pasted text.')
  } else {
    if (linkAvg > 0)
      goalExpl.push(
        `Goal links average strength ${(linkAvg * 100).toFixed(0)}% (your evidence fields).`
      )
    if (mentions > 0)
      goalExpl.push(`Goal relevance: goal titles appear in message text (${mentions} hit(s)).`)
    if (collaborationSignals > 0.15) {
      goalExpl.push(
        'Collaboration / project language detected in uploads (verbatim alignment snippets).'
      )
    }
  }

  if (trendRatio > 1.15)
    trajExpl.push('↑ Trajectory: more logged interactions in the last 14 days than the prior 14.')
  else if (trendRatio < 0.85)
    trajExpl.push('↓ Trajectory: fewer logged interactions recently vs the prior 14 days.')
  else trajExpl.push('Trajectory: roughly flat cadence in the last two weeks vs prior two.')

  if (input.perceivedState === 'damaged') {
    trajExpl.push(
      'State is "damaged" — suggestions should bias toward repair and clarity (user-set).'
    )
  }

  const signals: ScoreSignals = {
    friend: {
      consistency,
      reciprocity,
      interaction_depth: interactionDepth,
      shared_experiences: sharedExperiences,
      reliability,
      notes_boost: noteSignals.reliabilityAdj,
    },
    goal: {
      link_strength_avg: linkStrengths.length ? linkAvg : 0,
      title_mentions_in_messages: mentions,
      collaboration_signals: collaborationSignals,
    },
    trajectory: {
      interactions_recent_14d: recentWindow.length,
      interactions_prior_14d: priorWindow.length,
      trend_ratio: trendRatio,
    },
    explanations: {
      friend: friendExpl,
      goal: goalExpl,
      trajectory: trajExpl,
    },
  }

  return {
    friend_score: round3(friend),
    goal_score: round3(goal_score),
    trajectory_score: round3(trajectory),
    signals,
  }
}

function round3(n: number) {
  return Math.round(n * 1000) / 1000
}
