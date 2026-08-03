import type { SupabaseClient } from '@supabase/supabase-js'

export type IntakeConcern = {
  text: string
  title: string
  source: 'rumination' | 'blocking_factor' | 'intake_response'
  severity?: 'high' | 'medium' | 'low'
  fearType?: string
  copingStrategies?: string[]
  impact?: string
}

const FEAR_PATTERN =
  /\b(fear|worried|worry|worries|anxious|anxiety|stress|stressed|concern|concerns|afraid|scared|nervous|overwhelm|overwhelmed|doubt|stuck|hold(s)? me back|mental loop|ruminat|panic|uneasy|apprehens)\b/i

const MAX_STARTER_SESSIONS = 4

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

function truncate(s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function severityToLevels(severity?: string): { stress: number; rumination: number } {
  const s = severity?.toLowerCase()
  if (s === 'high') return { stress: 8, rumination: 8 }
  if (s === 'low') return { stress: 3, rumination: 4 }
  return { stress: 5, rumination: 6 }
}

function impactToSeverity(impact?: string): 'high' | 'medium' | 'low' {
  const i = impact?.toLowerCase()
  if (i === 'high') return 'high'
  if (i === 'low') return 'low'
  return 'medium'
}

export function extractIntakeConcerns(assessmentData: Record<string, unknown>): IntakeConcern[] {
  const out: IntakeConcern[] = []
  const seen = new Set<string>()

  const push = (concern: IntakeConcern) => {
    const key = norm(concern.text)
    if (!key || key.length < 8 || seen.has(key)) return
    seen.add(key)
    out.push(concern)
  }

  const ruminations = assessmentData.ruminations
  if (Array.isArray(ruminations)) {
    for (const raw of ruminations) {
      if (!raw || typeof raw !== 'object') continue
      const r = raw as Record<string, unknown>
      const description = typeof r.description === 'string' ? r.description.trim() : ''
      if (!description) continue
      const severity =
        r.severity === 'high' || r.severity === 'medium' || r.severity === 'low'
          ? r.severity
          : undefined
      push({
        text: description,
        title: truncate(description, 72),
        source: 'rumination',
        severity,
        fearType: typeof r.fear_type === 'string' ? r.fear_type : undefined,
        copingStrategies: Array.isArray(r.coping_strategies)
          ? (r.coping_strategies as string[]).filter((s) => typeof s === 'string')
          : undefined,
      })
    }
  }

  const blocking = assessmentData.executive_blocking_factors
  if (Array.isArray(blocking)) {
    for (const raw of blocking) {
      if (!raw || typeof raw !== 'object') continue
      const b = raw as Record<string, unknown>
      const factor = typeof b.factor === 'string' ? b.factor.trim() : ''
      if (!factor) continue
      const impact = typeof b.impact === 'string' ? b.impact : undefined
      push({
        text: factor,
        title: truncate(factor, 72),
        source: 'blocking_factor',
        severity: impactToSeverity(impact),
        impact,
        copingStrategies: Array.isArray(b.strategies)
          ? (b.strategies as string[]).filter((s) => typeof s === 'string')
          : undefined,
      })
    }
  }

  const messages = assessmentData.conversation_messages
  if (Array.isArray(messages)) {
    for (const raw of messages) {
      if (!raw || typeof raw !== 'object') continue
      const m = raw as Record<string, unknown>
      if (m.role !== 'user') continue
      const content = typeof m.content === 'string' ? m.content.trim() : ''
      if (content.length < 12 || content.length > 1200) continue
      if (!FEAR_PATTERN.test(content)) continue
      push({
        text: content,
        title: truncate(content, 72),
        source: 'intake_response',
        severity: 'medium',
      })
    }
  }

  return out.slice(0, MAX_STARTER_SESSIONS)
}

async function ensureIamPresentModuleInstalled(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  await supabase.from('installed_modules').upsert(
    {
      user_id: userId,
      module_id: 'narrative-integration',
      is_active: true,
      last_accessed: new Date().toISOString(),
    },
    { onConflict: 'user_id,module_id' }
  )
}

export async function createIamPresentStartersFromIntake(
  supabase: SupabaseClient,
  userId: string,
  assessmentData: Record<string, unknown>
): Promise<{ sessions_created: number; errors: string[] }> {
  const errors: string[] = []

  if (assessmentData.iam_present_starters_synced_at) {
    return { sessions_created: 0, errors }
  }

  const concerns = extractIntakeConcerns(assessmentData)
  if (concerns.length === 0) {
    return { sessions_created: 0, errors }
  }

  const { data: existingSessions } = await supabase
    .from('narrative_integration_sessions')
    .select('id, title, event_summary')
    .eq('user_id', userId)
    .limit(100)

  const existingKeys = new Set<string>()
  for (const row of existingSessions ?? []) {
    if (typeof row.title === 'string') existingKeys.add(norm(row.title))
    if (typeof row.event_summary === 'string') existingKeys.add(norm(row.event_summary))
  }

  let sessionsCreated = 0

  for (const concern of concerns) {
    const summaryKey = norm(concern.text)
    if (existingKeys.has(summaryKey) || existingKeys.has(norm(concern.title))) continue

    const levels = severityToLevels(concern.severity)
    const sessionTitle =
      concern.source === 'rumination'
        ? `Intake worry: ${truncate(concern.title, 64)}`
        : concern.source === 'blocking_factor'
          ? `Intake blocker: ${truncate(concern.title, 60)}`
          : `Intake concern: ${truncate(concern.title, 62)}`

    const { data: session, error: sessionError } = await supabase
      .from('narrative_integration_sessions')
      .insert({
        user_id: userId,
        title: sessionTitle,
        event_summary: concern.text.slice(0, 2000),
        user_goal: 'Explore and integrate this worry from my Dream Catcher intake.',
        emotional_state: concern.fearType
          ? `Related to: ${concern.fearType}`
          : concern.impact
            ? `Impact: ${concern.impact}`
            : 'Captured during intake',
        stress_level: levels.stress,
        rumination_level: levels.rumination,
        readiness_to_process: true,
        safety_status: 'ok',
        current_phase: 'state_check',
        completion_status: 'in_progress',
      })
      .select('id')
      .single()

    if (sessionError || !session?.id) {
      errors.push(`I Am Present session: ${sessionError?.message ?? 'insert failed'}`)
      continue
    }

    const copingNote =
      concern.copingStrategies && concern.copingStrategies.length > 0
        ? `Coping strategies mentioned: ${concern.copingStrategies.join('; ')}`
        : null

    const { error: eventError } = await supabase.from('narrative_integration_events').insert({
      session_id: session.id,
      event_name: truncate(concern.title, 120),
      what_happened_briefly: concern.text.slice(0, 2000),
      emotional_impact:
        concern.severity === 'high'
          ? 'High emotional weight — shared during Dream Catcher intake.'
          : concern.severity === 'low'
            ? 'Mild but recurring concern from intake.'
            : 'Meaningful concern from Dream Catcher intake.',
      unresolved_question: 'What would help me relate to this differently or move forward?',
      how_it_affects_life_now: copingNote ?? 'Shared during new user / Dream Catcher intake.',
      brief_description: concern.text.slice(0, 500),
    })

    if (eventError) {
      errors.push(`I Am Present event: ${eventError.message}`)
    }

    await supabase.from('narrative_integration_messages').insert([
      {
        session_id: session.id,
        role: 'system',
        content:
          'This starter session was created from your Dream Catcher intake. Your worry or concern is captured here — open this session anytime in I Am Present to work through it at your pace.',
        phase: 'state_check',
      },
      {
        session_id: session.id,
        role: 'user',
        content: concern.text.slice(0, 4000),
        phase: 'state_check',
      },
    ])

    existingKeys.add(summaryKey)
    existingKeys.add(norm(sessionTitle))
    sessionsCreated++
  }

  if (sessionsCreated > 0) {
    await ensureIamPresentModuleInstalled(supabase, userId)

    const { data: profile } = await supabase
      .from('profiles')
      .select('assessment_data')
      .eq('id', userId)
      .maybeSingle()

    const existingAssessment =
      profile?.assessment_data && typeof profile.assessment_data === 'object'
        ? (profile.assessment_data as Record<string, unknown>)
        : {}

    await supabase
      .from('profiles')
      .update({
        assessment_data: {
          ...existingAssessment,
          iam_present_starters_synced_at: new Date().toISOString(),
          iam_present_starters_count: sessionsCreated,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
  }

  return { sessions_created: sessionsCreated, errors }
}
