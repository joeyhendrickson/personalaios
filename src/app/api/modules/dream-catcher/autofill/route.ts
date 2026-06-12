import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { commitOnboardingPlan } from '@/lib/dream-catcher/commit-onboarding-plan'
import {
  generateOnboardingPlan,
  onboardingPlanSchema,
  type OnboardingPlan,
  type SeedGoal,
} from '@/lib/dream-catcher/generate-onboarding-plan'

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
      plan: prebuiltPlan,
    }: {
      goals?: SeedGoal[]
      vision_statement?: string
      personality_traits?: string[]
      dreams_discovered?: string[]
      is_new_user?: boolean
      plan?: OnboardingPlan
    } = body

    if (!goals || !Array.isArray(goals) || goals.length === 0) {
      return NextResponse.json({ error: 'Goals are required' }, { status: 400 })
    }

    let plan: OnboardingPlan
    if (prebuiltPlan) {
      plan = onboardingPlanSchema.parse(prebuiltPlan)
    } else {
      plan = await generateOnboardingPlan({
        visionStatement: vision_statement,
        dreams: dreams_discovered,
        personalityTraits: personality_traits,
        seedGoals: goals,
      })
    }

    const { counts, errors } = await commitOnboardingPlan(supabase, user.id, plan, {
      visionStatement: vision_statement,
      isNewUser: is_new_user,
      overwriteVision: is_new_user,
    })

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
      goals_added: counts.goals_added,
      counts,
      summary: plan.summary,
      errors: errors.length > 0 ? errors : undefined,
      message:
        errors.length > 0
          ? `Added to your dashboard with some issues: ${counts.goals_added} goals, ${counts.projects_added} projects, ${counts.tasks_added} tasks, ${counts.habits_added} habits. Existing items were kept.`
          : is_new_user
            ? `Your dashboard is ready: ${counts.goals_added} goals, ${counts.projects_added} projects, ${counts.tasks_added} tasks, ${counts.habits_added} habits.`
            : `Added to your dashboard: ${counts.goals_added} new goals, ${counts.projects_added} projects, ${counts.tasks_added} tasks, ${counts.habits_added} habits. Your existing items were not changed.`,
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
