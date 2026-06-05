import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { commitProposal, type CommitContext } from '@/lib/assistant/commit-proposal'
import type { ActionProposalRow } from '@/lib/assistant/proposal-schemas'
import { generateOnboardingPlan, type SeedGoal } from '@/lib/dream-catcher/generate-onboarding-plan'

const HIERARCHY_ORDER = { create_goal: 0, create_project: 1, create_task: 2 } as const

function norm(title: string) {
  return title.trim().toLowerCase()
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      goals,
      vision_statement,
      personality_traits,
      dreams_discovered,
      is_new_user = false,
    }: {
      goals?: SeedGoal[]
      vision_statement?: string
      personality_traits?: string[]
      dreams_discovered?: string[]
      is_new_user?: boolean
    } = body

    if (!goals || !Array.isArray(goals) || goals.length === 0) {
      return NextResponse.json({ error: 'Goals are required' }, { status: 400 })
    }

    // 1) Generate a full starter dashboard (goals → projects → tasks → habits).
    const plan = await generateOnboardingPlan({
      visionStatement: vision_statement,
      dreams: dreams_discovered,
      personalityTraits: personality_traits,
      seedGoals: goals,
    })

    // 2) Pre-seed the link maps with the user's existing entities so we link to
    //    (and don't duplicate) anything already on their dashboard.
    const ctx: CommitContext = { goalTitleToId: new Map(), projectTitleToId: new Map() }

    const [{ data: existingGoals }, { data: existingProjects }, { data: existingHabits }] =
      await Promise.all([
        supabase.from('goals').select('id, title').eq('user_id', user.id),
        supabase.from('projects').select('id, title').eq('user_id', user.id),
        supabase.from('daily_habits').select('title').eq('user_id', user.id),
      ])

    existingGoals?.forEach((g) => g.title && ctx.goalTitleToId.set(norm(g.title), g.id))
    existingProjects?.forEach((p) => p.title && ctx.projectTitleToId.set(norm(p.title), p.id))
    const existingHabitTitles = new Set(
      (existingHabits || []).map((h) => norm(h.title || '')).filter(Boolean)
    )

    const counts = { goals_added: 0, projects_added: 0, tasks_added: 0, habits_added: 0 }
    const errors: string[] = []

    // 3) Commit goals → projects → tasks via the canonical write path.
    const hierarchyItems = plan.items
      .filter((i) => i.type !== 'create_habit')
      .sort(
        (a, b) =>
          HIERARCHY_ORDER[a.type as keyof typeof HIERARCHY_ORDER] -
          HIERARCHY_ORDER[b.type as keyof typeof HIERARCHY_ORDER]
      )

    for (const item of hierarchyItems) {
      const { type, ...payload } = item as { type: string } & Record<string, unknown>

      // Skip duplicates we already have (idempotent re-runs / existing users).
      if (type === 'create_goal' && ctx.goalTitleToId.has(norm(String(payload.title)))) continue
      if (type === 'create_project' && ctx.projectTitleToId.has(norm(String(payload.title))))
        continue

      try {
        await commitProposal(
          supabase,
          user.id,
          { action_type: type, payload } as unknown as ActionProposalRow,
          ctx
        )
        if (type === 'create_goal') counts.goals_added++
        else if (type === 'create_project') counts.projects_added++
        else if (type === 'create_task') counts.tasks_added++
      } catch (err) {
        errors.push(
          `${type} "${String(payload.title)}": ${err instanceof Error ? err.message : 'failed'}`
        )
      }
    }

    // 4) Insert habits directly into daily_habits.
    const habitItems = plan.items.filter((i) => i.type === 'create_habit')
    if (habitItems.length > 0) {
      const { data: maxHabit } = await supabase
        .from('daily_habits')
        .select('order_index')
        .eq('user_id', user.id)
        .order('order_index', { ascending: false })
        .limit(1)
        .maybeSingle()

      let nextOrder = (maxHabit?.order_index ?? -1) + 1

      for (const habit of habitItems) {
        if (habit.type !== 'create_habit') continue
        if (existingHabitTitles.has(norm(habit.title))) continue
        const { error: habitError } = await supabase.from('daily_habits').insert({
          user_id: user.id,
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

    // 5) Mark onboarding complete so the dashboard stops routing here.
    await supabase.from('assistant_onboarding_state').upsert(
      {
        user_id: user.id,
        status: 'completed',
        step: 99,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'dream_catcher_autofill',
      description: `Dream Catcher set up dashboard: ${counts.goals_added} goals, ${counts.projects_added} projects, ${counts.tasks_added} tasks, ${counts.habits_added} habits`,
      metadata: { ...counts, is_new_user },
    })

    return NextResponse.json({
      success: true,
      // Back-compat field used by the existing client redirect.
      goals_added: counts.goals_added,
      counts,
      summary: plan.summary,
      errors: errors.length > 0 ? errors : undefined,
      message:
        errors.length > 0
          ? `Set up your dashboard with some issues: ${counts.goals_added} goals, ${counts.projects_added} projects, ${counts.tasks_added} tasks, ${counts.habits_added} habits.`
          : `Your dashboard is ready: ${counts.goals_added} goals, ${counts.projects_added} projects, ${counts.tasks_added} tasks, ${counts.habits_added} habits.`,
    })
  } catch (error) {
    console.error('Error in autofill Dream Catcher API:', error)
    return NextResponse.json(
      {
        error: 'Failed to set up dashboard',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
