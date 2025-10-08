import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Generating AI insights for user:', user.id)

    // Fetch all user data for comprehensive analysis
    const [
      { data: goals },
      { data: tasks },
      { data: habits },
      { data: priorities },
      { data: accomplishments },
      { data: pointsData },
    ] = await Promise.all([
      supabase.from('weekly_goals').select('*').eq('user_id', user.id), // Projects stored in weekly_goals table
      supabase.from('tasks').select('*').eq('user_id', user.id),
      supabase.from('daily_habits').select('*').eq('user_id', user.id),
      supabase.from('priorities').select('*').eq('user_id', user.id).eq('deleted', false),
      supabase
        .from('accomplishments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('points_ledger').select('points, created_at').eq('user_id', user.id),
    ])

    // Calculate statistics
    const totalProjects = goals?.length || 0
    const completedProjects = goals?.filter((g) => g.is_completed).length || 0
    const activeProjects = goals?.filter((g) => !g.is_completed).length || 0

    const totalTasks = tasks?.length || 0
    const completedTasks = tasks?.filter((t: any) => t.status === 'completed').length || 0
    const activeTasks = tasks?.filter((t: any) => t.status !== 'completed').length || 0

    const totalHabits = habits?.length || 0
    const totalPriorities = priorities?.length || 0

    const totalPoints = pointsData?.reduce((sum, p) => sum + p.points, 0) || 0

    // Create comprehensive prompt for AI analysis
    const analysisPrompt = `You are an expert life coach and productivity analyst. Analyze this user's activity data from their Life Stacks productivity system and provide deep insights.

USER DATA SUMMARY:
- Total Points Earned: ${totalPoints}
- Projects: ${completedProjects} completed out of ${totalProjects} total (${activeProjects} active)
- Tasks: ${completedTasks} completed out of ${totalTasks} total (${activeTasks} active)
- Daily Habits Configured: ${totalHabits}
- Active Priorities: ${totalPriorities}
- Recent Accomplishments: ${accomplishments?.length || 0}

PROJECTS BREAKDOWN:
${
  goals
    ?.slice(0, 10)
    .map(
      (g: any) =>
        `- ${g.title} (${g.category}) - ${g.is_completed ? 'COMPLETED' : 'IN PROGRESS'} - ${g.current_points}/${g.target_points} points`
    )
    .join('\n') || 'No projects'
}

ACTIVE PRIORITIES:
${
  priorities
    ?.slice(0, 5)
    .map((p: any) => `- ${p.title} (Priority: ${p.priority || 'N/A'})`)
    .join('\n') || 'No priorities'
}

HABITS:
${habits?.map((h: any) => `- ${h.title}`).join('\n') || 'No habits'}

RECENT ACCOMPLISHMENTS:
${
  accomplishments
    ?.slice(0, 10)
    .map((a: any) => `- ${a.title} (+${a.points} pts) - ${a.accomplishment_type}`)
    .join('\n') || 'No accomplishments'
}

Based on this data, provide a comprehensive analysis in the following JSON structure:

{
  "overallProgress": "A 1-2 sentence summary of the user's overall progress and trajectory",
  "strengths": ["Array of 3-5 specific strengths you observe in their data"],
  "areasForImprovement": ["Array of 3-5 specific areas where they could improve"],
  "actionableRecommendations": ["Array of 5-7 specific, actionable recommendations to help them reach their goals faster"],
  "goalAlignment": "A paragraph analyzing how well their current activities align with their stated goals",
  "productivityScore": 0-100,
  "nextSteps": ["Array of 3-5 immediate next steps they should take this week"]
}

Be specific, encouraging, and data-driven. Focus on patterns you see in their activity. Reference actual goals, tasks, and categories when making recommendations. The productivity score should reflect their completion rates, consistency, and goal alignment.

Return ONLY valid JSON, no markdown.`

    console.log('Calling AI for insights...')
    const { text: aiResponse } = await generateText({
      model: openai('gpt-4.1-mini'),
      messages: [
        {
          role: 'system',
          content:
            'You are an expert life coach and productivity analyst. Provide insightful, encouraging, and actionable feedback based on user data. Return only valid JSON.',
        },
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
    })

    console.log('AI response received')
    let insights

    try {
      insights = JSON.parse(aiResponse)
    } catch {
      console.error('Failed to parse AI response:', aiResponse)
      return NextResponse.json(
        { error: 'Failed to parse AI insights. Please try again.' },
        { status: 500 }
      )
    }

    // Validate the response structure
    if (!insights.overallProgress || !insights.strengths || !insights.actionableRecommendations) {
      console.error('Invalid AI response structure:', insights)
      return NextResponse.json({ error: 'Invalid AI response. Please try again.' }, { status: 500 })
    }

    console.log('AI insights generated successfully')
    return NextResponse.json(insights)
  } catch (error) {
    console.error('Error generating AI insights:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate AI insights',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
