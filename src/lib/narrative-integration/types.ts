export type NarrativeIntegrationSafetyStatus = 'ok' | 'needs_grounding' | 'high_risk'

export type NarrativeIntegrationPhase =
  | 'state_check'
  | 'stabilization'
  | 'event_inventory'
  | 'rumination_analysis'
  | 'narrative_clarification'
  | 'frozen_belief'
  | 'meaning_making'
  | 'present_grounding'
  | 'future_reorientation'
  | 'closure_summary'

export type NarrativeIntegrationCompletionStatus = 'in_progress' | 'completed' | 'aborted'

export interface NarrativeIntegrationSession {
  id: string
  user_id: string
  created_at: string
  updated_at: string

  title: string | null
  event_summary: string | null

  stress_level: number | null
  rumination_level: number | null
  engagement_level: number | null

  dissociation_indicators: boolean | null
  safety_status: NarrativeIntegrationSafetyStatus
  current_phase: NarrativeIntegrationPhase

  user_goal?: string | null
  emotional_state?: string | null
  readiness_to_process?: boolean | null

  meaning_statement: string | null
  lesson_statement: string | null
  present_grounding_summary: string | null
  future_action: string | null

  completion_status: NarrativeIntegrationCompletionStatus
  completed_at: string | null
}

export interface NarrativeIntegrationEventInventory {
  event_name?: string | null
  approximate_time_period?: string | null
  people_involved_optional?: string | null
  what_happened_briefly?: string | null
  emotional_impact?: string | null
  what_question_keeps_repeating?: string | null
  what_belief_formed_afterward?: string | null
  how_it_affects_life_now?: string | null
}

export interface NarrativeEvent extends NarrativeIntegrationEventInventory {
  id: string
  session_id: string
  created_at: string
  updated_at: string

  brief_description?: string | null
  unresolved_question?: string | null
  frozen_belief?: string | null
  current_reinterpretation?: string | null
  extracted_lesson?: string | null
  integration_score?: number | null
}

export type MeaningCategory =
  | 'Self-knowledge'
  | 'Boundaries'
  | 'Discernment'
  | 'Strength'
  | 'Values'
  | 'Relationships'
  | 'Human nature'
  | 'Spiritual/existential meaning'
  | 'Life direction'
  | 'Compassion'
  | 'Agency'

export interface MeaningExtraction {
  id: string
  session_id: string
  created_at: string
  updated_at: string

  category: string | null
  user_selected_meaning: string | null
  ai_suggested_meanings: unknown
  final_meaning_statement: string | null
  confidence_level: number | null
  user_edited: boolean | null
}

export interface FutureReorientation {
  id: string
  session_id: string
  created_at: string
  updated_at: string

  linked_goal_id_optional: string | null
  linked_project_id_optional: string | null
  next_action: string | null
  user_commitment: string | null
  follow_up_date_optional: string | null
}

export interface NarrativeIntegrationMessage {
  id: string
  session_id: string
  created_at: string
  role: 'user' | 'assistant' | 'system'
  content: string
  rumination_score: number | null
  rumination_pattern: string | null
  phase: NarrativeIntegrationPhase | null
}

export type RuminationPattern =
  | 'productive_reflection'
  | 'looping'
  | 'flooding'
  | 'avoidant'
  | 'integrating'

export interface RuminationAnalysisResult {
  rumination_score: number // 1-10
  pattern: RuminationPattern
  recommended_next_phase: NarrativeIntegrationPhase
}

export interface SafetyAssessment {
  safety_status: NarrativeIntegrationSafetyStatus
  dissociation_indicators: boolean
  reasons: string[]
  disable_deep_processing: boolean
}
