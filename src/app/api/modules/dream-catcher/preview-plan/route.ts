import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildDashboardPlanPreview } from '@/lib/dream-catcher/dashboard-plan-preview'
import {
  assessmentDataToPlanInput,
  generateOnboardingPlan,
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
    const { assessment_data, vision_statement } = body as {
      assessment_data?: Record<string, unknown>
      vision_statement?: string
    }

    const raw = assessment_data ?? body
    const planInput = assessmentDataToPlanInput(raw)

    if (!planInput.seedGoals?.length) {
      return NextResponse.json({ error: 'Goals are required' }, { status: 400 })
    }

    if (vision_statement && !planInput.visionStatement) {
      planInput.visionStatement = vision_statement
    }

    const plan = await generateOnboardingPlan(planInput)
    const preview = buildDashboardPlanPreview(plan, planInput.visionStatement)

    return NextResponse.json({
      success: true,
      preview,
      plan,
    })
  } catch (error) {
    console.error('Error in preview-plan Dream Catcher API:', error)
    return NextResponse.json(
      {
        error: 'Failed to preview dashboard plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
