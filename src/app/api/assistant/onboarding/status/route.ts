import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function isDashboardEmpty(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const [goals, projects, tasks, habits] = await Promise.all([
    supabase.from('goals').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase
      .from('daily_habits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true),
  ])

  return {
    isEmpty:
      (goals.count ?? 0) === 0 &&
      (projects.count ?? 0) === 0 &&
      (tasks.count ?? 0) === 0 &&
      (habits.count ?? 0) === 0,
    counts: {
      goals: goals.count ?? 0,
      projects: projects.count ?? 0,
      tasks: tasks.count ?? 0,
      habits: habits.count ?? 0,
    },
  }
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { isEmpty, counts } = await isDashboardEmpty(supabase, user.id)

  const { data: row } = await supabase
    .from('assistant_onboarding_state')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({
    isEmptyDashboard: isEmpty,
    counts,
    onboarding: row ?? { status: 'not_started', step: 0, responses: {} },
  })
}
