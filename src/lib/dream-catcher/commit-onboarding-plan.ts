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
  isNewUser?: boolean
  /** When false, never overwrite an existing vision statement. */
  overwriteVision?: boolean
}

export type CommitOnboardingPlanResult = {
  counts: {
    goals_added: number
    projects_added: number
    tasks_added: number
    habits_added: number
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
  ] = await Promise.all([
    supabase.from('goals').select('id, title').eq('user_id', userId),
    supabase.from('projects').select('id, title').eq('user_id', userId),
    supabase.from('daily_habits').select('title').eq('user_id', userId),
    supabase.from('tasks').select('title, weekly_goal_id').eq('user_id', userId),
    supabase.from('user_vision').select('vision_statement').eq('user_id', userId).maybeSingle(),
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

  const counts = { goals_added: 0, projects_added: 0, tasks_added: 0, habits_added: 0 }
  const errors: string[] = []

  const hierarchyItems = plan.items
    .filter((i) => i.type !== 'create_habit')
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

  return { counts, errors }
}
