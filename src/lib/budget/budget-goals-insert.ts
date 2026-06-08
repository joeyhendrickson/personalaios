import type { SupabaseClient } from '@supabase/supabase-js'

export type BudgetGoalInput = {
  title: string
  description?: string
  goal_type: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  goal_category: 'income' | 'budget_reduction'
  target_value?: number
  target_unit?: string
  priority_level: number
  start_date?: string
  target_date?: string
}

export type BudgetGoalRow = BudgetGoalInput & {
  id: string
  user_id: string
  status: string
  is_added_to_dashboard?: boolean
  added_to_dashboard_at?: string | null
  created_at?: string
  updated_at?: string
}

function isSchemaMismatch(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('column') ||
    m.includes('schema cache') ||
    m.includes('could not find') ||
    m.includes('violates not-null constraint')
  )
}

function legacyPriority(level: number): 'low' | 'medium' | 'high' {
  if (level <= 2) return 'high'
  if (level >= 4) return 'low'
  return 'medium'
}

function categoryTag(category: BudgetGoalInput['goal_category']): string {
  return `[budget_goal_category:${category}]`
}

function withCategoryNote(
  description: string | undefined,
  category: BudgetGoalInput['goal_category']
) {
  const tag = categoryTag(category)
  if (!description?.trim()) return tag
  if (description.includes(tag)) return description
  return `${description.trim()}\n${tag}`
}

export function normalizeBudgetGoalRow(row: Record<string, unknown>): BudgetGoalRow {
  const description = typeof row.description === 'string' ? row.description : undefined
  let goal_category = row.goal_category as BudgetGoalInput['goal_category'] | undefined
  if (!goal_category && description) {
    const match = description.match(/\[budget_goal_category:(income|budget_reduction)\]/)
    if (match) goal_category = match[1] as BudgetGoalInput['goal_category']
  }

  return {
    id: String(row.id),
    user_id: String(row.user_id),
    title: String(row.title ?? row.name ?? 'Budget goal'),
    description,
    goal_type: (row.goal_type as BudgetGoalInput['goal_type']) ?? 'monthly',
    goal_category: goal_category ?? 'budget_reduction',
    target_value:
      row.target_value != null
        ? Number(row.target_value)
        : row.target_amount != null
          ? Number(row.target_amount)
          : undefined,
    target_unit: typeof row.target_unit === 'string' ? row.target_unit : 'dollars',
    priority_level: typeof row.priority_level === 'number' ? row.priority_level : 3,
    start_date: typeof row.start_date === 'string' ? row.start_date : undefined,
    target_date: typeof row.target_date === 'string' ? row.target_date : undefined,
    status: typeof row.status === 'string' ? row.status : 'pending',
    is_added_to_dashboard: Boolean(row.is_added_to_dashboard),
    added_to_dashboard_at:
      typeof row.added_to_dashboard_at === 'string' ? row.added_to_dashboard_at : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : undefined,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : undefined,
  }
}

export async function insertBudgetGoal(
  supabase: SupabaseClient,
  userId: string,
  input: BudgetGoalInput
): Promise<{ goal: BudgetGoalRow | null; error: string | null }> {
  const modernRecord = {
    user_id: userId,
    title: input.title,
    description: input.description ?? null,
    goal_type: input.goal_type,
    goal_category: input.goal_category,
    target_value: input.target_value ?? null,
    target_unit: input.target_unit ?? 'dollars',
    priority_level: input.priority_level,
    start_date: input.start_date ?? null,
    target_date: input.target_date ?? null,
    status: 'pending',
  }

  const modern = await supabase.from('budget_goals').insert(modernRecord).select('*').single()
  if (!modern.error && modern.data) {
    return { goal: normalizeBudgetGoalRow(modern.data as Record<string, unknown>), error: null }
  }

  if (!modern.error || !isSchemaMismatch(modern.error.message)) {
    return { goal: null, error: modern.error?.message ?? 'Failed to create budget goal' }
  }

  const legacyRecord = {
    user_id: userId,
    name: input.title,
    description: withCategoryNote(input.description, input.goal_category),
    target_amount: input.target_value ?? 0,
    target_date: input.target_date ?? null,
    priority: legacyPriority(input.priority_level),
    status: 'active',
  }

  const legacy = await supabase.from('budget_goals').insert(legacyRecord).select('*').single()
  if (legacy.error) {
    return { goal: null, error: legacy.error.message }
  }

  return {
    goal: normalizeBudgetGoalRow({
      ...(legacy.data as Record<string, unknown>),
      goal_type: input.goal_type,
      goal_category: input.goal_category,
      target_unit: input.target_unit ?? 'dollars',
      priority_level: input.priority_level,
      status: 'pending',
    }),
    error: null,
  }
}
