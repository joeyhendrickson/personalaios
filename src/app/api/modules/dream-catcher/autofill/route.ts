import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { commitOnboardingPlan } from '@/lib/dream-catcher/commit-onboarding-plan'
import {
  assessmentDataToPlanInput,
  generateOnboardingPlan,
  onboardingPlanSchema,
  type OnboardingPlan,
} from '@/lib/dream-catcher/generate-onboarding-plan'
import {
  saveDreamCatcherSession,
  type DreamCatcherConversationMessage,
} from '@/lib/dream-catcher/save-session'
import { createIamPresentStartersFromIntake } from '@/lib/dream-catcher/create-iam-present-starters'
import { withPersonSummary } from '@/lib/dream-catcher/person-summary'

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
      conversation_messages: topLevelMessages,
      session_source: bodySessionSource,
    }: {
      assessment_data?: Record<string, unknown>
      vision_statement?: string
      is_new_user?: boolean
      plan?: OnboardingPlan
      conversation_messages?: DreamCatcherConversationMessage[]
      session_source?: 'onboarding' | 'dream_catcher' | 'fear_catcher'
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

    const { counts, errors: commitErrors } = await commitOnboardingPlan(supabase, user.id, plan, {
      visionStatement: planInput.visionStatement,
      lifePlanSummary: planInput.lifePlanSummary ?? plan.life_plan_summary,
      isNewUser: is_new_user,
      overwriteVision: is_new_user,
    })

    const errors = [...commitErrors]
    const iamPresent = await createIamPresentStartersFromIntake(supabase, user.id, raw)
    if (iamPresent.errors.length) {
      errors.push(...iamPresent.errors)
    }

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
      metadata: { ...counts, is_new_user, iam_present_starters_added: iamPresent.sessions_created },
    })

    const hasErrors = errors.length > 0

    const embeddedMessages = Array.isArray(raw.conversation_messages)
      ? (raw.conversation_messages as DreamCatcherConversationMessage[])
      : undefined
    const conversation_messages = topLevelMessages?.length ? topLevelMessages : embeddedMessages

    const sessionSource =
      bodySessionSource ??
      (is_new_user
        ? 'onboarding'
        : raw.session_source === 'fear_catcher'
          ? 'fear_catcher'
          : 'dream_catcher')

    let saved_session_id: string | undefined
    const saveResult = await saveDreamCatcherSession(supabase, user.id, {
      assessment_data: withPersonSummary(raw),
      conversation_messages,
      current_phase: typeof raw.current_phase === 'string' ? raw.current_phase : 'confirm',
      intake_question_index:
        typeof raw.intake_question_index === 'number'
          ? raw.intake_question_index
          : typeof raw.personality_question_index === 'number'
            ? raw.personality_question_index
            : undefined,
      session_source: sessionSource,
      completed_at: new Date().toISOString(),
    })
    if ('session_id' in saveResult) {
      saved_session_id = saveResult.session_id
    } else {
      console.warn(
        '[DreamCatcher] autofill saved dashboard but session save failed:',
        saveResult.error
      )
    }

    return NextResponse.json({
      success: true,
      goals_added: counts.goals_added,
      counts: {
        ...counts,
        iam_present_starters_added: iamPresent.sessions_created,
      },
      summary: plan.summary,
      life_plan_summary: plan.life_plan_summary ?? planInput.lifePlanSummary,
      errors: hasErrors ? errors : undefined,
      message:
        formatCommitMessage(counts, is_new_user, hasErrors) +
        (iamPresent.sessions_created > 0
          ? ` ${iamPresent.sessions_created} starter session(s) were added to I Am Present for worries from your intake.`
          : ''),
      saved_session_id,
      iam_present_starters_added: iamPresent.sessions_created,
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
