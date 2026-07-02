import type { SupabaseClient } from '@supabase/supabase-js'
import { commitProposal, type CommitContext } from '@/lib/assistant/commit-proposal'
import type { ActionProposalRow } from '@/lib/assistant/proposal-schemas'
import type { OnboardingPlan } from '@/lib/dream-catcher/generate-onboarding-plan'
import { computeGoalsSignature } from '@/lib/vision/goals-signature'

const HIERARCHY_ORDER = { create_goal: 0, create_project: 1, create_task: 2 } as const

function norm(title: string) {
  return title.trim().toLowerCase()
}

export type CommitOnboardingPlanOptions = {
  visionStatement?: string
  lifePlanSummary?: string
  isNewUser?: boolean
  overwriteVision?: boolean
}

export type CommitOnboardingPlanResult = {
  counts: {
    goals_added: number
    projects_added: number
    tasks_added: number
    habits_added: number
    education_added: number
    fitness_goals_added: number
    ruminations_added: number
    gratitude_added: number
    relationships_added: number
  }
  errors: string[]
}

export async function commitOnboardingPlan(
  supabase: SupabaseClient,
  userId: string,
  plan: OnboardingPlan,
  options: CommitOnboardingPlanOptions = {}
): Promise<CommitOnboardingPlanResult> {
  const ctx: CommitContext = { goalTitleToId: new Map(), projectTitleToId: new Map() }

  const [
    { data: existingGoals },
    { data: existingProjects },
    { data: existingHabits },
    { data: existingTasks },
    { data: existingVision },
    { data: existingEducation },
    { data: existingFitness },
    { data: existingFears },
    { data: existingRelationships },
  ] = await Promise.all([
    supabase.from('goals').select('id, title').eq('user_id', userId),
    supabase.from('projects').select('id, title').eq('user_id', userId),
    supabase.from('daily_habits').select('title').eq('user_id', userId),
    supabase.from('tasks').select('title, weekly_goal_id').eq('user_id', userId),
    supabase.from('user_vision').select('vision_statement').eq('user_id', userId).maybeSingle(),
    supabase.from('education_items').select('title').eq('user_id', userId),
    supabase.from('fitness_goals').select('id, description, goal_type').eq('user_id', userId),
    supabase.from('user_fears_insights').select('description').eq('user_id', userId),
    supabase.from('relationships').select('name').eq('user_id', userId).eq('is_active', true),
  ])

  existingGoals?.forEach((g) => g.title && ctx.goalTitleToId.set(norm(g.title), g.id))
  existingProjects?.forEach((p) => p.title && ctx.projectTitleToId.set(norm(p.title), p.id))

  const existingHabitTitles = new Set(
    (existingHabits || []).map((h) => norm(h.title || '')).filter(Boolean)
  )
  const existingTaskKeys = new Set(
    (existingTasks || [])
      .map((t) => `${norm(t.title || '')}:${t.weekly_goal_id || ''}`)
      .filter((k) => !k.startsWith(':'))
  )
  const existingEducationTitles = new Set(
    (existingEducation || []).map((e) => norm(e.title || '')).filter(Boolean)
  )
  const existingFearDescriptions = new Set(
    (existingFears || []).map((f) => norm(f.description || '')).filter(Boolean)
  )
  const existingRelationshipNames = new Set(
    (existingRelationships || []).map((r) => norm(r.name || '')).filter(Boolean)
  )

  const counts = {
    goals_added: 0,
    projects_added: 0,
    tasks_added: 0,
    habits_added: 0,
    education_added: 0,
    fitness_goals_added: 0,
    ruminations_added: 0,
    gratitude_added: 0,
    relationships_added: 0,
  }
  const errors: string[] = []

  const hierarchyItems = plan.items
    .filter(
      (i) => i.type === 'create_goal' || i.type === 'create_project' || i.type === 'create_task'
    )
    .sort(
      (a, b) =>
        HIERARCHY_ORDER[a.type as keyof typeof HIERARCHY_ORDER] -
        HIERARCHY_ORDER[b.type as keyof typeof HIERARCHY_ORDER]
    )

  for (const item of hierarchyItems) {
    const { type, ...payload } = item as { type: string } & Record<string, unknown>

    if (type === 'create_goal' && ctx.goalTitleToId.has(norm(String(payload.title)))) continue
    if (type === 'create_project' && ctx.projectTitleToId.has(norm(String(payload.title)))) continue

    if (type === 'create_task') {
      const projectTitle = String(payload.project_title || '')
      const projectId = ctx.projectTitleToId.get(norm(projectTitle))
      const taskKey = `${norm(String(payload.title))}:${projectId || ''}`
      if (projectId && existingTaskKeys.has(taskKey)) continue
    }

    try {
      await commitProposal(
        supabase,
        userId,
        { action_type: type, payload } as unknown as ActionProposalRow,
        ctx
      )
      if (type === 'create_goal') counts.goals_added++
      else if (type === 'create_project') counts.projects_added++
      else if (type === 'create_task') {
        counts.tasks_added++
        const projectTitle = String(payload.project_title || '')
        const projectId = ctx.projectTitleToId.get(norm(projectTitle))
        if (projectId) {
          existingTaskKeys.add(`${norm(String(payload.title))}:${projectId}`)
        }
      }
    } catch (err) {
      errors.push(
        `${type} "${String(payload.title)}": ${err instanceof Error ? err.message : 'failed'}`
      )
    }
  }

  const habitItems = plan.items.filter((i) => i.type === 'create_habit')
  if (habitItems.length > 0) {
    const { data: maxHabit } = await supabase
      .from('daily_habits')
      .select('order_index')
      .eq('user_id', userId)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle()

    let nextOrder = (maxHabit?.order_index ?? -1) + 1

    for (const habit of habitItems) {
      if (habit.type !== 'create_habit') continue
      if (existingHabitTitles.has(norm(habit.title))) continue
      const { error: habitError } = await supabase.from('daily_habits').insert({
        user_id: userId,
        title: habit.title,
        description: habit.description ?? null,
        points_per_completion: habit.points_per_completion ?? 25,
        is_active: true,
        order_index: nextOrder++,
      })
      if (habitError) errors.push(`habit "${habit.title}": ${habitError.message}`)
      else counts.habits_added++
    }
  }

  for (const item of plan.items) {
    if (item.type === 'create_education_item') {
      if (existingEducationTitles.has(norm(item.title))) continue
      const { error } = await supabase.from('education_items').insert({
        user_id: userId,
        title: item.title,
        description: item.description ?? '',
        points_value: item.points_value ?? 100,
        priority_level: item.priority_level ?? 3,
        target_date: item.target_date ?? null,
        status: 'pending',
        is_active: true,
      })
      if (error) errors.push(`education "${item.title}": ${error.message}`)
      else counts.education_added++
    }

    if (item.type === 'create_fitness_goal') {
      const { error } = await supabase.from('fitness_goals').insert({
        user_id: userId,
        goal_type: item.goal_type,
        description: item.description ?? null,
        target_weight: item.target_weight ?? null,
        current_weight: item.current_weight ?? null,
        target_body_fat_percentage: item.target_body_fat_percentage ?? null,
        current_body_fat_percentage: item.current_body_fat_percentage ?? null,
        target_areas: item.target_areas ?? [],
        timeline_weeks: item.timeline_weeks ?? 12,
        priority_level: item.priority_level ?? 'medium',
        is_active: true,
      })
      if (error) errors.push(`fitness goal: ${error.message}`)
      else counts.fitness_goals_added++
    }

    if (item.type === 'create_fear_insight') {
      if (existingFearDescriptions.has(norm(item.description))) continue
      const { error } = await supabase.from('user_fears_insights').insert({
        user_id: userId,
        fear_type: item.fear_type.slice(0, 80),
        description: item.description.slice(0, 2000),
        severity: item.severity,
        related_apps: [],
        coping_strategies: item.coping_strategies ?? [],
        progress_notes: 'Starter rumination from Dream Catcher onboarding.',
      })
      if (error) errors.push(`rumination: ${error.message}`)
      else counts.ruminations_added++
    }

    if (item.type === 'create_gratitude_starter') {
      const today = new Date().toISOString().split('T')[0]
      const { error } = await supabase.from('gratitude_journal_entries').upsert(
        {
          user_id: userId,
          entry_date: today,
          gratitude_items: item.gratitude_items,
          reflection: item.reflection ?? 'Starter entry from Dream Catcher — edit anytime.',
          mood_rating: null,
        },
        { onConflict: 'user_id,entry_date' }
      )
      if (error) errors.push(`gratitude: ${error.message}`)
      else counts.gratitude_added++
    }

    if (item.type === 'create_relationship') {
      if (existingRelationshipNames.has(norm(item.name))) continue
      const { error } = await supabase.from('relationships').insert({
        user_id: userId,
        name: item.name,
        relationship_type: item.relationship_type,
        contact_frequency_days: item.contact_frequency_days ?? 14,
        notes: item.notes ?? 'Added from Dream Catcher Life Plan.',
        priority_level: item.priority_level ?? 3,
        is_active: true,
      })
      if (error) errors.push(`relationship "${item.name}": ${error.message}`)
      else counts.relationships_added++
    }
  }

  const visionStatement = options.visionStatement?.trim()
  const hasExistingVision = Boolean(existingVision?.vision_statement?.trim())
  const shouldWriteVision =
    visionStatement &&
    visionStatement.length > 0 &&
    (options.overwriteVision === true || !hasExistingVision || options.isNewUser)

  if (shouldWriteVision) {
    try {
      const { data: currentGoals } = await supabase
        .from('goals')
        .select('id, title, status')
        .eq('user_id', userId)
      await supabase.from('user_vision').upsert(
        {
          user_id: userId,
          vision_statement: visionStatement!.slice(0, 2000),
          goals_signature: computeGoalsSignature(currentGoals || []),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
    } catch (visionErr) {
      console.error('Failed to persist vision during onboarding commit:', visionErr)
    }
  }

  void options.lifePlanSummary

  return { counts, errors }
}
