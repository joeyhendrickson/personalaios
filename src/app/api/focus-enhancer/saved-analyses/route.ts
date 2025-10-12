import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all saved analysis summaries for the user
    const { data: analyses, error: fetchError } = await supabase
      .from('focus_analysis_summaries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50) // Limit to last 50 analyses

    if (fetchError) {
      console.error('Error fetching saved analyses:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch saved analyses', details: fetchError.message },
        { status: 500 }
      )
    }

    // Transform the data to match the frontend expectations
    const transformedAnalyses = analyses.map((analysis) => ({
      id: analysis.id,
      timestamp: analysis.timestamp,
      totalScreenTime: analysis.total_screen_time,
      problematicAppsCount: analysis.problematic_apps_count,
      conversation: analysis.conversation_data,
      appUsage: analysis.app_usage_data,
      therapeuticInsights: analysis.therapeutic_insights,
      dynamicSuggestions: analysis.dynamic_suggestions,
      userFears: analysis.user_fears,
      suggestedHabits: analysis.suggested_habits,
      suggestedProjects: analysis.suggested_projects,
      createdAt: analysis.created_at,
    }))

    return NextResponse.json({
      analyses: transformedAnalyses,
    })
  } catch (error: any) {
    console.error('Error fetching saved analyses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch saved analyses', details: error.message },
      { status: 500 }
    )
  }
}
