import type { SupabaseClient } from '@supabase/supabase-js'

export type DreamCatcherConversationMessage = {
  id?: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  phase?: string
}

export type SaveDreamCatcherSessionInput = {
  assessment_data: Record<string, unknown>
  conversation_messages?: DreamCatcherConversationMessage[]
  current_phase?: string
  intake_question_index?: number
  /** onboarding = new user setup; dream_catcher = module journey; fear_catcher = alternate path */
  session_source?: 'onboarding' | 'dream_catcher' | 'fear_catcher'
  session_title?: string
  completed_at?: string | null
}

function deriveSessionTitle(data: Record<string, unknown>): string {
  const explicit = data.session_title
  if (typeof explicit === 'string' && explicit.trim()) return explicit.trim()

  const vision = data.vision_statement
  if (typeof vision === 'string' && vision.trim()) {
    const v = vision.trim()
    return v.length > 60 ? `${v.slice(0, 57)}…` : v
  }

  const dreams = data.dreams_discovered
  if (Array.isArray(dreams) && typeof dreams[0] === 'string' && dreams[0].trim()) {
    return dreams[0].trim().slice(0, 60)
  }

  const goals = data.goals_generated
  if (Array.isArray(goals) && goals.length > 0) {
    const first = goals[0] as { goal?: string }
    if (typeof first?.goal === 'string' && first.goal.trim()) {
      return first.goal.trim().slice(0, 60)
    }
  }

  const source = data.session_source
  if (source === 'onboarding') return 'My Life Plan'
  if (source === 'fear_catcher') return 'Fear Catcher Journey'
  return 'Dream Catcher Session'
}

/** Merge conversation + metadata into the JSON stored in dream_catcher_sessions. */
export function buildDreamCatcherSessionPayload(input: SaveDreamCatcherSessionInput): {
  assessment_data: Record<string, unknown>
  completed_at: string
} {
  const {
    assessment_data,
    conversation_messages,
    current_phase,
    intake_question_index,
    session_source,
    session_title,
    completed_at,
  } = input

  const payload: Record<string, unknown> = {
    ...assessment_data,
  }

  if (conversation_messages?.length) {
    payload.conversation_messages = conversation_messages
  }
  if (current_phase) payload.current_phase = current_phase
  if (intake_question_index !== undefined) {
    payload.intake_question_index = intake_question_index
    payload.personality_question_index = intake_question_index
  }
  if (session_source) payload.session_source = session_source
  if (session_title) payload.session_title = session_title

  payload.session_title = deriveSessionTitle(payload)

  const resolvedCompletedAt = completed_at ?? new Date().toISOString()

  return {
    assessment_data: payload,
    completed_at: resolvedCompletedAt,
  }
}

export async function saveDreamCatcherSession(
  supabase: SupabaseClient,
  userId: string,
  input: SaveDreamCatcherSessionInput
): Promise<{ session_id: string } | { error: string }> {
  const { assessment_data, completed_at } = buildDreamCatcherSessionPayload(input)

  const { data: savedSession, error: saveError } = await supabase
    .from('dream_catcher_sessions')
    .insert({
      user_id: userId,
      assessment_data,
      completed_at,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (saveError) {
    console.error('[DreamCatcher] save session failed:', saveError)
    return { error: saveError.message }
  }

  const { conversation_messages, ...restOfAssessmentData } = assessment_data

  const profileAssessmentData = {
    ...restOfAssessmentData,
    last_updated: new Date().toISOString(),
  }

  await supabase
    .from('profiles')
    .update({
      assessment_data: profileAssessmentData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  return { session_id: savedSession.id as string }
}
