export type PerceivedRelationshipState = 'clean' | 'neutral' | 'damaged'

export type InteractionKind = 'message' | 'call' | 'hangout' | 'project' | 'other'

export type PersonGoalLinkType = 'advisor' | 'collaborator' | 'potential' | 'none'

export type NextMoveType = 'strategic' | 'social' | 'maintenance' | 'recovery'

export type NextMoveActionType =
  | 'advance_goal'
  | 'strengthen_relationship'
  | 'test_alignment'
  | 'correct_trajectory'

export interface InteractionExtraction {
  topics_discussed: string[]
  emotional_tone: 'positive' | 'neutral' | 'negative'
  alignment_signals: string[]
  commitments: Array<{ quote: string; party: 'self' | 'them' | 'unclear' }>
  shared_experience_snippets: string[]
  model_version?: string
}

export interface PersonRow {
  id: string
  user_id: string
  name: string
  notes: string | null
  perceived_relationship_state: PerceivedRelationshipState
  created_at: string
  updated_at: string
}

export interface InteractionRow {
  id: string
  user_id: string
  person_id: string
  type: InteractionKind
  content: string
  interaction_at: string
  created_at: string
  extraction?: InteractionExtraction | Record<string, unknown> | null
}

export interface RelationshipScoresRow {
  person_id: string
  user_id: string
  friend_score: number
  goal_score: number
  trajectory_score: number
  signals: Record<string, unknown>
  last_updated: string
}

export interface PersonGoalLinkRow {
  id: string
  user_id: string
  person_id: string
  goal_id: string
  link_type: PersonGoalLinkType
  strength: number
  evidence: string | null
  created_at: string
}

export interface GoalRow {
  id: string
  title: string
  category?: string | null
}

export interface ScoreSignals {
  friend: {
    consistency: number
    reciprocity: number
    interaction_depth: number
    shared_experiences: number
    reliability: number
    notes_boost: number
  }
  goal: {
    link_strength_avg: number
    title_mentions_in_messages: number
    collaboration_signals: number
  }
  trajectory: {
    interactions_recent_14d: number
    interactions_prior_14d: number
    trend_ratio: number
  }
  explanations: {
    friend: string[]
    goal: string[]
    trajectory: string[]
  }
}

export interface NextMoveResult {
  type: NextMoveType
  action_type: NextMoveActionType
  strategy: string
  next_move: string
  reasoning: string
  optional_message: string | null
  optional_activity: string | null
  optional_agenda: string | null
}

export interface PersonIntelligenceProfile {
  identity: { name: string; notes: string | null }
  relationship_state: string
  interaction_count: number
  extracted: {
    topics_discussed: string[]
    shared_experience_snippets: string[]
    behavioral_traits_from_notes: string[]
    tone_summary: string
  }
}

export interface WeeklyRiskAlert {
  person_id: string
  name: string
  code: 'drift' | 'reliability' | 'misalignment'
  severity: 'low' | 'medium'
  detail: string
}

export interface WeeklyReviewResult {
  scoresUpdated: number
  topRelationships: Array<{
    person_id: string
    name: string
    friend_score: number
    goal_score: number
    trajectory_score: number
    impact_hint?: string
  }>
  trajectoryUp: Array<{ person_id: string; name: string; trajectory_score: number }>
  trajectoryDown: Array<{ person_id: string; name: string; trajectory_score: number }>
  riskAlerts: WeeklyRiskAlert[]
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
  previousTrajectoryByPerson?: Record<string, number>
}
