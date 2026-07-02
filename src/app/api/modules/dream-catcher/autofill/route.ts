import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { commitOnboardingPlan } from '@/lib/dream-catcher/commit-onboarding-plan'
import {
  assessmentDataToPlanInput,
  generateOnboardingPlan,
  onboardingPlanSchema,
  type OnboardingPlan,
} from '@/lib/dream-catcher/generate-onboarding-plan'

function formatCommitMessage(
  counts: Record<string, number>,
  isNewUser: boolean,
  hasErrors: boolean
): string {
  const parts = [
    `${counts.goals_added ?? 0} goals`,
    `${counts.projects_added ?? 0} projects`,
    `${counts.tasks_added ?? 0} tasks`,
    `${counts.habits_added ?? 0} habits`,
  ]
  const moduleParts: string[] = []
  if (counts.education_added) moduleParts.push(`${counts.education_added} education items`)
  if (counts.fitness_goals_added) moduleParts.push(`${counts.fitness_goals_added} fitness goals`)
  if (counts.ruminations_added) moduleParts.push(`${counts.ruminations_added} focus ruminations`)
  if (counts.gratitude_added) moduleParts.push(`${counts.gratitude_added} gratitude starter`)
  if (counts.relationships_added) moduleParts.push(`${counts.relationships_added} relationships`)

  const core = parts.join(', ')
  const modules = moduleParts.length ? `; plus ${moduleParts.join(', ')}` : ''
  if (hasErrors) {
    return `Added to your Life Plan with some issues: ${core}${modules}. Existing items were kept.`
  }
  return isNewUser
    ? `Your Life Plan is ready: ${core}${modules}.`
    : `Added to your Life Plan: ${core}${modules}. Your existing items were not changed.`
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
      assessment_data,
      vision_statement,
      is_new_user = false,
      plan: prebuiltPlan,
    }: {
      assessment_data?: Record<string, unknown>
      vision_statement?: string
      is_new_user?: boolean
      plan?: OnboardingPlan
    } = body

    const raw = assessment_data ?? body
    const planInput = assessmentDataToPlanInput(raw)

    if (!planInput.seedGoals?.length) {
      return NextResponse.json({ error: 'Goals are required' }, { status: 400 })
    }

    if (vision_statement && !planInput.visionStatement) {
      planInput.visionStatement = vision_statement
    }

    let plan: OnboardingPlan
    if (prebuiltPlan) {
      plan = onboardingPlanSchema.parse(prebuiltPlan)
    } else {
      plan = await generateOnboardingPlan(planInput)
    }

    const { counts, errors } = await commitOnboardingPlan(supabase, user.id, plan, {
      visionStatement: planInput.visionStatement,
      lifePlanSummary: planInput.lifePlanSummary ?? plan.life_plan_summary,
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
      description: `Dream Catcher Life Plan: ${counts.goals_added} goals, ${counts.projects_added} projects, ${counts.tasks_added} tasks, ${counts.habits_added} habits, ${counts.education_added} education, ${counts.fitness_goals_added} fitness, ${counts.ruminations_added} ruminations, ${counts.gratitude_added} gratitude, ${counts.relationships_added} relationships`,
      metadata: { ...counts, is_new_user },
    })

    const hasErrors = errors.length > 0

    return NextResponse.json({
      success: true,
      goals_added: counts.goals_added,
      counts,
      summary: plan.summary,
      life_plan_summary: plan.life_plan_summary ?? planInput.lifePlanSummary,
      errors: hasErrors ? errors : undefined,
      message: formatCommitMessage(counts, is_new_user, hasErrors),
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
