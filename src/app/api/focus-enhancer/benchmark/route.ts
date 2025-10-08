import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

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

    const { currentAnalysis } = await request.json()

    if (!currentAnalysis) {
      return NextResponse.json({ error: 'No current analysis provided' }, { status: 400 })
    }

    // Fetch historical analyses for benchmarking
    const { data: historicalAnalyses, error: fetchError } = await supabase
      .from('focus_analysis_summaries')
      .select('app_usage_data, total_screen_time, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10) // Get last 10 analyses for comparison

    if (fetchError) {
      console.error('Error fetching historical analyses:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch historical data', details: fetchError.message },
        { status: 500 }
      )
    }

    // Calculate benchmark metrics
    const historicalScreenTimes = historicalAnalyses.map(a => a.total_screen_time).filter(t => t > 0)
    const averageTotalHours = historicalScreenTimes.length > 0 
      ? historicalScreenTimes.reduce((sum, time) => sum + time, 0) / historicalScreenTimes.length 
      : 0

    const currentTotalHours = currentAnalysis.totalScreenTime
    const trend = historicalScreenTimes.length > 0 
      ? (currentTotalHours < averageTotalHours ? 'improving' : 
         currentTotalHours > averageTotalHours ? 'declining' : 'stable')
      : 'baseline'

    // Calculate app-specific comparisons
    const appComparisons = []
    if (currentAnalysis.appUsage && currentAnalysis.appUsage.length > 0) {
      for (const currentApp of currentAnalysis.appUsage) {
        // Find historical usage for this app
        const historicalUsages = historicalAnalyses
          .map(analysis => analysis.app_usage_data?.find((app: any) => app.appName === currentApp.appName))
          .filter(app => app && app.hours > 0)
          .map(app => app.hours)

        if (historicalUsages.length > 0) {
          const averageHours = historicalUsages.reduce((sum, hours) => sum + hours, 0) / historicalUsages.length
          const change = currentApp.hours - averageHours

          appComparisons.push({
            appName: currentApp.appName,
            currentHours: currentApp.hours,
            averageHours,
            change,
            isProblematic: currentApp.isProblematic
          })
        }
      }
    }

    // Generate AI insights about the benchmark
    const { text: benchmarkInsights } = await generateText({
      model: openai('gpt-4.1-mini'),
      messages: [
        {
          role: 'user',
          content: `Analyze this user's screen time benchmark data and provide insights:

Current Screen Time: ${currentTotalHours.toFixed(1)} hours
Historical Average: ${averageTotalHours.toFixed(1)} hours
Trend: ${trend}
Problematic Apps: ${currentAnalysis.problematicAppsCount}

App Comparisons:
${appComparisons.map(app => `${app.appName}: ${app.currentHours.toFixed(1)}h (avg: ${app.averageHours.toFixed(1)}h, change: ${app.change >= 0 ? '+' : ''}${app.change.toFixed(1)}h)`).join('\n')}

Provide 2-3 concise insights about their progress and recommendations. Focus on:
1. Overall screen time trends
2. Specific app usage patterns
3. Actionable recommendations

Keep it under 150 words.`
        }
      ],
      maxTokens: 200,
      temperature: 0.7,
    })

    const benchmark = {
      currentTotalHours,
      averageTotalHours,
      trend,
      appComparisons,
      insights: benchmarkInsights,
      analysisCount: historicalAnalyses.length,
      lastAnalysisDate: historicalAnalyses.length > 0 ? historicalAnalyses[0].created_at : null
    }

    return NextResponse.json({
      benchmark
    })

  } catch (error: any) {
    console.error('Error generating benchmark:', error)
    return NextResponse.json(
      { error: 'Failed to generate benchmark', details: error.message },
      { status: 500 }
    )
  }
}
