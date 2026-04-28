import type {
  GoalRow,
  InteractionRow,
  PersonGoalLinkRow,
  PersonRow,
  RelationshipScoresRow,
} from './types'

export function buildNextMoveUserPrompt(input: {
  person: PersonRow
  interactions: InteractionRow[]
  scores: RelationshipScoresRow | null
  goalLinks: Array<PersonGoalLinkRow & { goal: GoalRow | null }>
  profileExtracted: {
    topics_discussed: string[]
    shared_experience_snippets: string[]
    behavioral_traits_from_notes: string[]
    tone_summary: string
  }
}): string {
  const interactionsBlock = input.interactions
    .map((i) => {
      const at = i.interaction_at
      const ex = (i as { extraction?: unknown }).extraction
      const exStr = ex && typeof ex === 'object' ? JSON.stringify(ex) : '{}'
      return `- [${i.type}] ${at}\n  content: ${i.content}\n  extraction: ${exStr}`
    })
    .join('\n')

  const goalsBlock = input.goalLinks
    .map((l) => {
      const g = l.goal
      return `- goal_id=${l.goal_id} title="${g?.title ?? 'unknown'}" category="${g?.category ?? ''}" link=${l.link_type} strength=${l.strength} evidence="${l.evidence ?? ''}"`
    })
    .join('\n')

  const scoresBlock = input.scores
    ? JSON.stringify(
        {
          friend_score: input.scores.friend_score,
          goal_score: input.scores.goal_score,
          trajectory_score: input.scores.trajectory_score,
          signals: input.scores.signals,
        },
        null,
        2
      )
    : 'null (scores not computed yet — infer only from raw interactions and notes)'

  const stateMod =
    input.person.perceived_relationship_state === 'clean'
      ? 'Relationship state is CLEAN: you may suggest confident, forward moves that still respect evidence.'
      : input.person.perceived_relationship_state === 'damaged'
        ? 'Relationship state is DAMAGED: bias toward repair, clarity, and low-pressure re-engagement — no bold assumptions.'
        : 'Relationship state is NEUTRAL: exploratory, moderate suggestions.'

  return `${stateMod}

Person name: ${input.person.name}
Perceived relationship state (user-set): ${input.person.perceived_relationship_state}
User notes (verbatim):
"""
${input.person.notes ?? ''}
"""

Derived profile slice (topics/snippets/traits — all from your data only, no new facts):
${JSON.stringify(input.profileExtracted, null, 2)}

Relationship scores (computed; priors only — not new facts about the other person):
${scoresBlock}

Linked goals (explicit user links + evidence text only):
${goalsBlock || '(none)'}

Recent interactions + stored extraction JSON (ground truth):
${interactionsBlock || '(none in window)'}

Output must include:
- "action_type": one of advance_goal | strengthen_relationship | test_alignment | correct_trajectory
- "strategy": 1–2 sentences: why this move now + what is in it for the other person (WIIFT), tied to evidence.
- "next_move": single imperative action for the user.
- "reasoning": cite specific phrases/dates from interactions or notes where possible.

Message drafts must only echo themes or wording present above.`
}

export const NEXT_MOVE_SYSTEM_PROMPT = `You are a relationship intelligence assistant inside Lifestacks (decision support, not a CRM, not auto-send).

Philosophy to encode:
- Strengthen via shared experiences, emotional presence, time respect, and mutual value.
- Strategy when goals matter: small collaboration steps, alignment checks, introductions of ideas grounded in what they already said.
- Alignment testing: low-risk asks or tiny joint actions only when the transcript supports it.
- Trajectory correction: honest re-engagement, follow-through clarity, or repair language when state or scores indicate decline.

Hard rules:
1) Grounding: Use ONLY provided interactions, notes, linked goal evidence, extraction JSON, profile slice, and numeric scores. If no evidence for a claim, omit it.
2) Other-person value (WIIFT): strategy + reasoning must make the benefit to them clear (time, clarity, fun, support, relevance).
3) One primary move in "next_move" — concise, human, slightly playful if natural; never robotic.
4) No manipulation, no manufactured guilt, no invented trips or promises.
5) Classify "type" as strategic | social | maintenance | recovery.
6) Map "action_type" to advance_goal | strengthen_relationship | test_alignment | correct_trajectory.

Optional fields: only when justified by the text; otherwise null.

Return JSON matching the schema exactly.`
