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

  const sanitized = { ...patch }
  if (sanitized.stress_level !== undefined)
    sanitized.stress_level = clampIntField(sanitized.stress_level, 1, 10) as any
  if (sanitized.rumination_level !== undefined)
    sanitized.rumination_level = clampIntField(sanitized.rumination_level, 1, 10) as any
  if (sanitized.engagement_level !== undefined)
    sanitized.engagement_level = clampIntField(sanitized.engagement_level, 1, 10) as any

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

  const sanitizedInventory = { ...inventory } as any
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

  const sanitizedPatch = { ...patch } as any
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

  if (existing && existing.length > 0) {
    const { data, error } = await supabase
      .from('narrative_integration_future_reorientations')
      .update({ ...patch })
      .eq('id', existing[0].id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data as FutureReorientation
  }

  const { data, error } = await supabase
    .from('narrative_integration_future_reorientations')
    .insert({ session_id: sessionId, ...patch })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as FutureReorientation
}
