import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const { analysisSummary } = await request.json()

    if (!analysisSummary) {
      return NextResponse.json({ error: 'No analysis data provided' }, { status: 400 })
    }

    // Store the complete analysis summary
    const { data: savedAnalysis, error: insertError } = await supabase
      .from('focus_analysis_summaries')
      .insert({
        user_id: user.id,
        timestamp: analysisSummary.timestamp,
        app_usage_data: analysisSummary.appUsage,
        therapeutic_insights: analysisSummary.therapeuticInsights,
        conversation_data: analysisSummary.conversation,
        dynamic_suggestions: analysisSummary.dynamicSuggestions,
        user_fears: analysisSummary.userFears,
        suggested_habits: analysisSummary.suggestedHabits,
        suggested_projects: analysisSummary.suggestedProjects,
        total_screen_time: analysisSummary.totalScreenTime,
        problematic_apps_count: analysisSummary.problematicAppsCount,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error saving analysis summary:', insertError)
      return NextResponse.json(
        { error: 'Failed to save analysis', details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      savedAnalysis: {
        id: savedAnalysis.id,
        timestamp: savedAnalysis.timestamp,
        totalScreenTime: savedAnalysis.total_screen_time,
        problematicAppsCount: savedAnalysis.problematic_apps_count,
        conversation: savedAnalysis.conversation_data,
        appUsage: savedAnalysis.app_usage_data,
        therapeuticInsights: savedAnalysis.therapeutic_insights,
        dynamicSuggestions: savedAnalysis.dynamic_suggestions,
        userFears: savedAnalysis.user_fears,
        suggestedHabits: savedAnalysis.suggested_habits,
        suggestedProjects: savedAnalysis.suggested_projects,
      },
    })
  } catch (error: any) {
    console.error('Error saving analysis:', error)
    return NextResponse.json(
      { error: 'Failed to save analysis', details: error.message },
      { status: 500 }
    )
  }
}
