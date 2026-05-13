import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type {
  FutureReorientation,
  MeaningExtraction,
  NarrativeEvent,
  NarrativeIntegrationMessage,
  NarrativeIntegrationPhase,
  NarrativeIntegrationSafetyStatus,
  NarrativeIntegrationSession,
  NarrativeIntegrationEventInventory,
} from './types'

function toInt(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined
  const n = Number(v)
  if (Number.isNaN(n)) return undefined
  return Math.round(n)
}

function clampIntField(v: unknown, min: number, max: number): number | undefined {
  const n = toInt(v)
  if (n === undefined) return undefined
  return Math.max(min, Math.min(max, n))
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUuid(v: unknown): boolean {
  return typeof v === 'string' && UUID_RE.test(v)
}

/** Postgres DATE rejects ""; coerce blanks and junk to null. */
function normalizeOptionalPgDate(v: unknown): string | null {
  if (v === null || v === undefined) return null
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (t === '') return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

const SESSION_ALLOWED = new Set([
  'title',
  'event_summary',
  'stress_level',
  'rumination_level',
  'engagement_level',
  'dissociation_indicators',
  'safety_status',
  'current_phase',
  'meaning_statement',
  'lesson_statement',
  'present_grounding_summary',
  'future_action',
  'completion_status',
  'completed_at',
  'user_goal',
  'emotional_state',
  'readiness_to_process',
])

const EVENT_ALLOWED = new Set([
  'event_name',
  'approximate_time_period',
  'people_involved_optional',
  'what_happened_briefly',
  'emotional_impact',
  'what_question_keeps_repeating',
  'what_belief_formed_afterward',
  'how_it_affects_life_now',
  'brief_description',
  'unresolved_question',
  'frozen_belief',
  'current_reinterpretation',
  'extracted_lesson',
  'integration_score',
])

const MEANING_ALLOWED = new Set([
  'category',
  'user_selected_meaning',
  'ai_suggested_meanings',
  'final_meaning_statement',
  'confidence_level',
  'user_edited',
])

const FUTURE_ALLOWED = new Set([
  'linked_goal_id_optional',
  'linked_project_id_optional',
  'next_action',
  'user_commitment',
  'follow_up_date_optional',
])

const FUTURE_UUID_FIELDS = new Set(['linked_goal_id_optional', 'linked_project_id_optional'])

function pickAllowed(obj: Record<string, any>, allowed: Set<string>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (!allowed.has(k)) continue
    if (FUTURE_UUID_FIELDS.has(k) && !isValidUuid(v)) continue
    out[k] = v
  }
  return out
}

export async function requireUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return user.id
}

export async function createNarrativeIntegrationSession(input: {
  title?: string
  event_summary?: string
  stress_level?: number
  rumination_level?: number
  readiness_to_process?: boolean
  emotional_state?: string
  user_goal?: string
  safety_status?: NarrativeIntegrationSafetyStatus
  current_phase?: NarrativeIntegrationPhase
}) {
  const supabase = await createClient()
  const userId = await requireUserId(supabase)

  const { data, error } = await supabase
    .from('narrative_integration_sessions')
    .insert({
      user_id: userId,
      title: input.title ?? null,
      event_summary: input.event_summary ?? null,
      stress_level: clampIntField(input.stress_level, 1, 10) ?? null,
      rumination_level: clampIntField(input.rumination_level, 1, 10) ?? null,
      readiness_to_process: input.readiness_to_process ?? null,
      emotional_state: input.emotional_state ?? null,
      user_goal: input.user_goal ?? null,
      safety_status: input.safety_status ?? 'ok',
      current_phase: input.current_phase ?? 'state_check',
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as NarrativeIntegrationSession
}

export async function getNarrativeIntegrationSession(sessionId: string) {
  const supabase = await createClient()
  const userId = await requireUserId(supabase)

  const { data, error } = await supabase
    .from('narrative_integration_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single()

  if (error) throw new Error(error.message)
  return data as NarrativeIntegrationSession
}

export async function listNarrativeIntegrationSessions() {
  const supabase = await createClient()
  const userId = await requireUserId(supabase)

  const { data, error } = await supabase
    .from('narrative_integration_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return (data || []) as NarrativeIntegrationSession[]
}

export async function updateNarrativeIntegrationSession(
  sessionId: string,
  patch: Partial<
    Pick<
      NarrativeIntegrationSession,
      | 'title'
      | 'event_summary'
      | 'stress_level'
      | 'rumination_level'
      | 'engagement_level'
      | 'dissociation_indicators'
      | 'safety_status'
      | 'current_phase'
      | 'meaning_statement'
      | 'lesson_statement'
      | 'present_grounding_summary'
      | 'future_action'
      | 'completion_status'
      | 'completed_at'
      | 'user_goal'
      | 'emotional_state'
      | 'readiness_to_process'
    >
  >
) {
  const supabase = await createClient()
  const userId = await requireUserId(supabase)

  const sanitized = pickAllowed(patch as Record<string, any>, SESSION_ALLOWED)
  if (sanitized.stress_level !== undefined)
    sanitized.stress_level = clampIntField(sanitized.stress_level, 1, 10)
  if (sanitized.rumination_level !== undefined)
    sanitized.rumination_level = clampIntField(sanitized.rumination_level, 1, 10)
  if (sanitized.engagement_level !== undefined)
    sanitized.engagement_level = clampIntField(sanitized.engagement_level, 1, 10)

  const { data, error } = await supabase
    .from('narrative_integration_sessions')
    .update(sanitized)
    .eq('id', sessionId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as NarrativeIntegrationSession
}

export async function upsertNarrativeIntegrationEventInventory(
  sessionId: string,
  inventory: NarrativeIntegrationEventInventory
) {
  const supabase = await createClient()
  await requireUserId(supabase)

  // Ensure ownership
  await getNarrativeIntegrationSession(sessionId)

  // Check existing
  const { data: existing, error: existingError } = await supabase
    .from('narrative_integration_events')
    .select('*')
    .eq('session_id', sessionId)
    .limit(1)

  if (existingError) throw new Error(existingError.message)

  const sanitizedInventory = pickAllowed(inventory as Record<string, any>, EVENT_ALLOWED)
  if (sanitizedInventory.integration_score !== undefined)
    sanitizedInventory.integration_score = clampIntField(
      sanitizedInventory.integration_score,
      1,
      10
    )

  if (existing && existing.length > 0) {
    const { data, error } = await supabase
      .from('narrative_integration_events')
      .update(sanitizedInventory)
      .eq('id', existing[0].id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data as NarrativeEvent
  }

  const { data, error } = await supabase
    .from('narrative_integration_events')
    .insert({ session_id: sessionId, ...sanitizedInventory })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as NarrativeEvent
}

export async function getNarrativeIntegrationEvent(sessionId: string) {
  const supabase = await createClient()
  await requireUserId(supabase)

  // Ensure ownership
  await getNarrativeIntegrationSession(sessionId)

  const { data, error } = await supabase
    .from('narrative_integration_events')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data || null) as NarrativeEvent | null
}

export async function addNarrativeIntegrationMessage(input: {
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  rumination_score?: number | null
  rumination_pattern?: string | null
  phase?: NarrativeIntegrationPhase | null
}) {
  const supabase = await createClient()
  await getNarrativeIntegrationSession(input.session_id)

  const { data, error } = await supabase
    .from('narrative_integration_messages')
    .insert({
      session_id: input.session_id,
      role: input.role,
      content: input.content,
      rumination_score: clampIntField(input.rumination_score, 1, 10) ?? null,
      rumination_pattern: input.rumination_pattern ?? null,
      phase: input.phase ?? null,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as NarrativeIntegrationMessage
}

export async function listNarrativeIntegrationMessages(sessionId: string) {
  const supabase = await createClient()
  await getNarrativeIntegrationSession(sessionId)

  const { data, error } = await supabase
    .from('narrative_integration_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) throw new Error(error.message)
  return (data || []) as NarrativeIntegrationMessage[]
}

export async function upsertMeaningExtraction(
  sessionId: string,
  patch: Partial<MeaningExtraction>
) {
  const supabase = await createClient()
  await getNarrativeIntegrationSession(sessionId)

  const { data: existing, error: existingError } = await supabase
    .from('narrative_integration_meaning_extractions')
    .select('*')
    .eq('session_id', sessionId)
    .limit(1)

  if (existingError) throw new Error(existingError.message)

  const sanitizedPatch = pickAllowed(patch as Record<string, any>, MEANING_ALLOWED)
  if (sanitizedPatch.confidence_level !== undefined)
    sanitizedPatch.confidence_level = clampIntField(sanitizedPatch.confidence_level, 1, 10)

  if (existing && existing.length > 0) {
    const { data, error } = await supabase
      .from('narrative_integration_meaning_extractions')
      .update(sanitizedPatch)
      .eq('id', existing[0].id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data as MeaningExtraction
  }

  const { data, error } = await supabase
    .from('narrative_integration_meaning_extractions')
    .insert({ session_id: sessionId, ...sanitizedPatch })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as MeaningExtraction
}

export async function upsertFutureReorientation(
  sessionId: string,
  patch: Partial<FutureReorientation>
) {
  const supabase = await createClient()
  await getNarrativeIntegrationSession(sessionId)

  const { data: existing, error: existingError } = await supabase
    .from('narrative_integration_future_reorientations')
    .select('*')
    .eq('session_id', sessionId)
    .limit(1)

  if (existingError) throw new Error(existingError.message)

  const sanitizedFuture = pickAllowed(patch as Record<string, any>, FUTURE_ALLOWED)
  if ('follow_up_date_optional' in sanitizedFuture) {
    sanitizedFuture.follow_up_date_optional = normalizeOptionalPgDate(
      sanitizedFuture.follow_up_date_optional
    )
  }

  if (existing && existing.length > 0) {
    const { data, error } = await supabase
      .from('narrative_integration_future_reorientations')
      .update(sanitizedFuture)
      .eq('id', existing[0].id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data as FutureReorientation
  }

  const { data, error } = await supabase
    .from('narrative_integration_future_reorientations')
    .insert({ session_id: sessionId, ...sanitizedFuture })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as FutureReorientation
}
