import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildDashboardPlanPreview } from '@/lib/dream-catcher/dashboard-plan-preview'
import { generateOnboardingPlan, type SeedGoal } from '@/lib/dream-catcher/generate-onboarding-plan'

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
    }: {
      goals?: SeedGoal[]
      vision_statement?: string
      personality_traits?: string[]
      dreams_discovered?: string[]
    } = body

    if (!goals || !Array.isArray(goals) || goals.length === 0) {
      return NextResponse.json({ error: 'Goals are required' }, { status: 400 })
    }

    const plan = await generateOnboardingPlan({
      visionStatement: vision_statement,
      dreams: dreams_discovered,
      personalityTraits: personality_traits,
      seedGoals: goals,
    })

    const preview = buildDashboardPlanPreview(plan, vision_statement)

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
