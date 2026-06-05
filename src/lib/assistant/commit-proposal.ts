import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createGoalPayloadSchema,
  createProjectPayloadSchema,
  createTaskPayloadSchema,
  createHabitPayloadSchema,
  type ActionProposalRow,
} from '@/lib/assistant/proposal-schemas'
import { getOrCreateCurrentWeek } from '@/lib/assistant/get-current-week'

export type CommitContext = {
  goalTitleToId: Map<string, string>
  projectTitleToId: Map<string, string>
}

function normTitle(title: string) {
  return title.trim().toLowerCase()
}

export async function commitProposal(
  supabase: SupabaseClient,
  userId: string,
  proposal: ActionProposalRow,
  ctx: CommitContext
): Promise<{ kind: string; record: Record<string, unknown> }> {
  if (proposal.action_type === 'create_goal') {
    const payload = createGoalPayloadSchema.parse(proposal.payload)
    const { data: goal, error } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        title: payload.title,
        description: payload.description,
        goal_type: payload.goal_type,
        target_value: payload.target_value,
        target_unit: payload.target_unit,
        current_value: 0,
        priority_level: payload.priority_level,
        start_date: payload.start_date ?? null,
        target_date: payload.target_date ?? null,
        status: 'active',
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    ctx.goalTitleToId.set(normTitle(payload.title), goal.id as string)
    return { kind: 'goal', record: goal as Record<string, unknown> }
  }

  if (proposal.action_type === 'create_project') {
    const payload = createProjectPayloadSchema.parse(proposal.payload)
    let goalId = payload.goal_id
    if (!goalId && payload.goal_title_ref) {
      goalId = ctx.goalTitleToId.get(normTitle(payload.goal_title_ref))
    }
    if (!goalId) {
      throw new Error('Project must be linked to a goal. Select or create a goal first.')
    }

    const { data: goalRow, error: goalErr } = await supabase
      .from('goals')
      .select('id')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single()
    if (goalErr || !goalRow) {
      throw new Error('Linked goal not found')
    }

    const currentWeek = await getOrCreateCurrentWeek(supabase)

    const { data: minSortRow } = await supabase
      .from('projects')
      .select('project_sort_order')
      .eq('user_id', userId)
      .order('project_sort_order', { ascending: true })
      .limit(1)
      .maybeSingle()

    const nextProjectSort =
      minSortRow?.project_sort_order !== undefined && minSortRow.project_sort_order !== null
        ? (minSortRow.project_sort_order as number) - 1
        : 0

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        week_id: currentWeek.id,
        project_sort_order: nextProjectSort,
        title: payload.title,
        description: payload.description,
        goal_id: goalId,
        category: payload.category,
        target_points: payload.target_points,
        target_money: 0,
        current_points: 0,
        priority: payload.priority,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    ctx.projectTitleToId.set(normTitle(payload.title), project.id as string)
    return { kind: 'project', record: project as Record<string, unknown> }
  }

  if (proposal.action_type === 'create_task') {
    const payload = createTaskPayloadSchema.parse(proposal.payload)
    let weeklyGoalId = payload.weekly_goal_id
    if (!weeklyGoalId && payload.project_title) {
      weeklyGoalId = ctx.projectTitleToId.get(normTitle(payload.project_title))
    }
    if (!weeklyGoalId) {
      throw new Error(
        'Task must be linked to a project. Confirm the project first or use Confirm all.'
      )
    }

    const { data: projectRow, error: projectErr } = await supabase
      .from('projects')
      .select('id')
      .eq('id', weeklyGoalId)
      .eq('user_id', userId)
      .single()
    if (projectErr || !projectRow) {
      throw new Error('Linked project not found')
    }

    const { data: maxSortResult } = await supabase
      .from('tasks')
      .select('sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const nextSortOrder = (maxSortResult?.sort_order || 0) + 1

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        weekly_goal_id: weeklyGoalId,
        title: payload.title,
        description: payload.description,
        category: payload.category,
        points_value: payload.points_value,
        money_value: 0,
        sort_order: nextSortOrder,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return { kind: 'task', record: task as Record<string, unknown> }
  }

  if (proposal.action_type === 'create_habit') {
    const payload = createHabitPayloadSchema.parse(proposal.payload)

    const { data: maxHabit } = await supabase
      .from('daily_habits')
      .select('order_index')
      .eq('user_id', userId)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextOrder = (maxHabit?.order_index ?? -1) + 1

    const { data: habit, error } = await supabase
      .from('daily_habits')
      .insert({
        user_id: userId,
        title: payload.title,
        description: payload.description ?? null,
        points_per_completion: payload.points_per_completion,
        is_active: true,
        order_index: nextOrder,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return { kind: 'habit', record: habit as Record<string, unknown> }
  }

  throw new Error(`Unsupported action_type: ${proposal.action_type}`)
}

export async function markProposalCommitted(
  supabase: SupabaseClient,
  userId: string,
  proposalId: string
) {
  await supabase
    .from('assistant_action_proposals')
    .update({ status: 'committed', committed_at: new Date().toISOString() })
    .eq('id', proposalId)
    .eq('user_id', userId)
}

export async function loadProposalForCommit(
  supabase: SupabaseClient,
  userId: string,
  proposalId: string
): Promise<ActionProposalRow> {
  const { data: proposal, error } = await supabase
    .from('assistant_action_proposals')
    .select('*')
    .eq('id', proposalId)
    .eq('user_id', userId)
    .single()

  if (error || !proposal) {
    throw new Error('Proposal not found')
  }
  if (proposal.status !== 'proposed') {
    throw new Error(`Proposal is ${proposal.status}`)
  }

  const expiresAt = new Date(proposal.expires_at as string)
  if (Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
    await supabase
      .from('assistant_action_proposals')
      .update({ status: 'expired' })
      .eq('id', proposalId)
      .eq('user_id', userId)
    throw new Error('Proposal expired')
  }

  return proposal as ActionProposalRow
}

const ACTION_ORDER: Record<ActionProposalRow['action_type'], number> = {
  create_goal: 0,
  create_project: 1,
  create_task: 2,
  create_habit: 3,
}

export function sortProposalsForCommit(rows: ActionProposalRow[]) {
  return [...rows].sort((a, b) => {
    const oa = ACTION_ORDER[a.action_type]
    const ob = ACTION_ORDER[b.action_type]
    if (oa !== ob) return oa - ob
    return (a.sort_order ?? 0) - (b.sort_order ?? 0)
  })
}
