import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

export type UserVisionContext = {
  goalsText: string
  projectsText: string
  prioritiesText: string
  habitsText: string
  combined: string
}

/**
 * Gathers the signed-in user's goals, projects, priorities, and habits to infer
 * what they are building toward — used to derive partner criteria and to score
 * how well a prospect aligns with the user's "best life" vision.
 */
export async function buildUserVisionContext(
  supabase: SupabaseClient,
  userId: string
): Promise<UserVisionContext> {
  const [goalsRes, projectsRes, prioritiesRes, habitsRes] = await Promise.all([
    supabase
      .from('goals')
      .select('title, description, goal_type, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('priority_level', { ascending: true })
      .limit(15),
    supabase
      .from('projects')
      .select('title, description, category, is_completed')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .order('updated_at', { ascending: false })
      .limit(15),
    supabase
      .from('priorities')
      .select('title, description, priority_type')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('habits')
      .select('title, category, frequency')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const goalsText =
    goalsRes.data?.map((g) => `- [${g.goal_type}] ${g.title}: ${g.description || ''}`).join('\n') ||
    '(No active high-level goals recorded.)'

  const projectsText =
    projectsRes.data
      ?.map((p) => `- ${p.title}: ${p.description || ''} (${p.category})`)
      .join('\n') || '(No active weekly projects.)'

  const prioritiesText =
    prioritiesRes.data?.map((p) => `- ${p.title}: ${p.description || ''}`).join('\n') ||
    '(No priorities list.)'

  const habitsText =
    habitsRes.data?.map((h) => `- ${h.title} (${h.category}, ${h.frequency})`).join('\n') ||
    '(No tracked habits.)'

  const combined = `USER GOALS:
${goalsText}

USER PROJECTS (weekly dashboard projects):
${projectsText}

USER PRIORITIES:
${prioritiesText}

USER HABITS:
${habitsText}`

  return { goalsText, projectsText, prioritiesText, habitsText, combined }
}

export type ProspectRecord = {
  name: string
  zip_code?: string | null
  how_we_met?: string | null
  positive_qualities?: string | null
  toxic_qualities?: string | null
  unknowns?: string | null
  feels_known?: string | null
  conflict_style?: string | null
  notes?: string | null
  assessment?: Record<string, unknown> | null
  attractiveness_score?: number | null
}

/** Flattens a prospect record into prompt-friendly text. */
export function prospectToText(p: ProspectRecord): string {
  const assessment = p.assessment || {}
  const assessmentLines = Object.entries(assessment)
    .filter(([, v]) => typeof v === 'string' && (v as string).trim())
    .map(([k, v]) => `- ${k.replace(/_/g, ' ')}: ${v}`)
    .join('\n')

  return [
    `Name: ${p.name}`,
    p.how_we_met ? `How we met: ${p.how_we_met}` : null,
    p.positive_qualities ? `Positive qualities: ${p.positive_qualities}` : null,
    p.toxic_qualities ? `Toxic / concerning qualities: ${p.toxic_qualities}` : null,
    p.unknowns ? `Unknown areas: ${p.unknowns}` : null,
    p.feels_known ? `Do they make me feel known/seen: ${p.feels_known}` : null,
    p.conflict_style ? `Conflict style (control/arguing): ${p.conflict_style}` : null,
    p.notes ? `Notes: ${p.notes}` : null,
    p.attractiveness_score != null
      ? `AI photo attractiveness score: ${p.attractiveness_score}/100`
      : null,
    assessmentLines ? `Structured assessment:\n${assessmentLines}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}
