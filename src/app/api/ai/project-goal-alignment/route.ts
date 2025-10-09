import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST() {
  try {
    console.log('[Project-Goal-Alignment] Starting API call...')
    const supabase = await createClient()

    console.log('[Project-Goal-Alignment] Getting authenticated user...')
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[Project-Goal-Alignment] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('[Project-Goal-Alignment] User authenticated:', user.id)

    // Fetch user's goals and projects
    console.log('[Project-Goal-Alignment] Fetching goals...')
    const { data: goals, error: goalsError } = await supabase
      .from('weekly_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_completed', false)

    if (goalsError) {
      console.error('[Project-Goal-Alignment] Error fetching goals:', goalsError)
      return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
    }
    console.log('[Project-Goal-Alignment] Goals fetched:', goals?.length || 0)

    // Fetch user's tasks
    console.log('[Project-Goal-Alignment] Fetching tasks...')
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending'])

    if (tasksError) {
      console.error('[Project-Goal-Alignment] Error fetching tasks:', tasksError)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }
    console.log('[Project-Goal-Alignment] Tasks fetched:', tasks?.length || 0)

    // Fetch user's habits
    console.log('[Project-Goal-Alignment] Fetching habits...')
    const { data: habits, error: habitsError } = await supabase
      .from('daily_habits')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (habitsError) {
      console.error('[Project-Goal-Alignment] Error fetching habits:', habitsError)
      return NextResponse.json({ error: 'Failed to fetch habits' }, { status: 500 })
    }
    console.log('[Project-Goal-Alignment] Habits fetched:', habits?.length || 0)

    // Fetch user's priorities
    console.log('[Project-Goal-Alignment] Fetching priorities...')
    const { data: priorities, error: prioritiesError } = await supabase
      .from('priorities')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_completed', false)
      .order('order_index', { ascending: true })

    if (prioritiesError) {
      console.error('[Project-Goal-Alignment] Error fetching priorities:', prioritiesError)
      return NextResponse.json({ error: 'Failed to fetch priorities' }, { status: 500 })
    }
    console.log('[Project-Goal-Alignment] Priorities fetched:', priorities?.length || 0)

    // Calculate progress metrics
    console.log('[Project-Goal-Alignment] Calculating progress metrics...')
    const safeGoals = goals || []
    const safeTasks = tasks || []
    const safeHabits = habits || []
    const safePriorities = priorities || []

    const totalTargetPoints = safeGoals.reduce((sum, goal) => sum + (goal.target_points || 0), 0)
    const totalCurrentPoints = safeGoals.reduce((sum, goal) => sum + (goal.current_points || 0), 0)
    const progressPercentage =
      totalTargetPoints > 0 ? Math.round((totalCurrentPoints / totalTargetPoints) * 100) : 0

    console.log('[Project-Goal-Alignment] Progress calculated:', {
      totalTargetPoints,
      totalCurrentPoints,
      progressPercentage,
    })

    // Calculate points by category
    console.log('[Project-Goal-Alignment] Calculating category points...')
    const categoryPoints = [...safeGoals, ...safeTasks].reduce(
      (acc, item) => {
        const category = item.category || 'Uncategorized'
        if (!acc[category]) {
          acc[category] = { current: 0, target: 0 }
        }

        if ('current_points' in item) {
          // This is a goal
          acc[category].current += item.current_points || 0
          acc[category].target += item.target_points || 0
        } else if ('status' in item) {
          // This is a task
          if (item.status === 'completed') {
            acc[category].current += item.points_value || 0
          }
        }

        return acc
      },
      {} as Record<string, { current: number; target: number }>
    )
    console.log(
      '[Project-Goal-Alignment] Category points calculated:',
      Object.keys(categoryPoints).length,
      'categories'
    )

    // Generate AI assessment
    console.log('[Project-Goal-Alignment] Generating AI prompt...')
    const prompt = `You are a personal productivity and goal achievement expert. Analyze this user's current project-goal alignment and provide actionable insights.

USER'S CURRENT SITUATION:
- Total Progress: ${progressPercentage}% (${totalCurrentPoints}/${totalTargetPoints} points)
- Active Goals: ${safeGoals.length}
- Active Tasks: ${safeTasks.length}
- Active Habits: ${safeHabits.length}
- Current Priorities: ${safePriorities.length}

GOALS BREAKDOWN:
${safeGoals.length > 0 ? safeGoals.map((goal) => `- ${goal.title || 'Untitled'}: ${goal.current_points || 0}/${goal.target_points || 0} points (${goal.category || 'Uncategorized'})`).join('\n') : '- No active goals'}

TASKS BREAKDOWN:
${safeTasks.length > 0 ? safeTasks.map((task) => `- ${task.title || 'Untitled'}: ${task.status || 'unknown'} (${task.category || 'Uncategorized'})`).join('\n') : '- No active tasks'}

HABITS BREAKDOWN:
${safeHabits.length > 0 ? safeHabits.map((habit) => `- ${habit.title || 'Untitled'}: ${habit.weekly_completion_count || 0} times this week`).join('\n') : '- No active habits'}

PRIORITIES:
${safePriorities.length > 0 ? safePriorities.map((priority) => `- ${priority.title || 'Untitled'}: Level ${priority.priority_level || 'N/A'}`).join('\n') : '- No current priorities'}

CATEGORY PROGRESS:
${Object.entries(categoryPoints)
  .map(([category, points]) => {
    const p = points as { current: number; target: number }
    return `- ${category}: ${p.current}/${p.target} points (${p.target > 0 ? Math.round((p.current / p.target) * 100) : 0}%)`
  })
  .join('\n')}

ANALYSIS REQUIREMENTS:
1. Assess project-goal alignment (are projects actually helping achieve goals?)
2. Identify misalignments and gaps
3. Provide specific, actionable recommendations
4. Focus on the most impactful changes
5. Consider the user's current priorities
6. Be direct and practical

Return your response as a JSON object with this structure:
{
  "alignment_score": 85,
  "overall_assessment": "Brief overall assessment of alignment",
  "key_insights": [
    "Key insight 1",
    "Key insight 2",
    "Key insight 3"
  ],
  "misalignments": [
    {
      "issue": "Description of misalignment",
      "impact": "High/Medium/Low",
      "recommendation": "Specific action to fix"
    }
  ],
  "recommendations": [
    {
      "category": "Goal/Project/Habit/Priority",
      "action": "Specific action to take",
      "reason": "Why this will help",
      "priority": "High/Medium/Low"
    }
  ],
  "next_steps": [
    "Immediate action 1",
    "Immediate action 2",
    "Immediate action 3"
  ]
}`
    console.log('[Project-Goal-Alignment] Prompt generated, length:', prompt.length)

    // Use gpt-4.1-mini
    let text: string
    try {
      console.log('[Project-Goal-Alignment] Calling OpenAI API with gpt-4.1-mini...')
      const result = await generateText({
        model: openai('gpt-4.1-mini'),
        prompt,
      })
      text = result.text
      console.log('[Project-Goal-Alignment] OpenAI API call successful')
    } catch (aiError) {
      console.error('[Project-Goal-Alignment] OpenAI API call failed:', aiError)
      const aiErrorMessage = aiError instanceof Error ? aiError.message : 'Unknown AI error'
      console.error('[Project-Goal-Alignment] AI Error details:', aiErrorMessage)
      throw new Error(`AI generation failed: ${aiErrorMessage}`)
    }

    let assessment
    try {
      console.log('[Project-Goal-Alignment] Parsing AI response...')
      assessment = JSON.parse(text)
      console.log('[Project-Goal-Alignment] AI response parsed successfully')
    } catch (parseError) {
      console.error('[Project-Goal-Alignment] Error parsing AI response:', parseError)
      console.log('[Project-Goal-Alignment] Raw AI response:', text?.substring(0, 500))
      // Fallback assessment
      assessment = {
        alignment_score: progressPercentage,
        overall_assessment: `You're currently at ${progressPercentage}% progress toward your goals. Focus on completing high-impact tasks that directly contribute to your most important goals.`,
        key_insights: [
          `You have ${goals.length} active goals across ${Object.keys(categoryPoints).length} categories`,
          `Your current progress is ${progressPercentage}% of your target points`,
          `You have ${tasks.length} active tasks and ${habits.length} habits`,
        ],
        misalignments: [],
        recommendations: [
          {
            category: 'Goal',
            action: "Review your goals to ensure they're specific and measurable",
            reason: 'Clear goals lead to better project alignment',
            priority: 'High',
          },
        ],
        next_steps: [
          'Complete at least one high-priority task today',
          'Review your goal progress weekly',
          'Focus on the most impactful activities',
        ],
      }
      console.log('[Project-Goal-Alignment] Using fallback assessment')
    }

    console.log('[Project-Goal-Alignment] Returning assessment')
    return NextResponse.json({ assessment })
  } catch (error) {
    console.error('Error in project-goal alignment API:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Error details:', { message: errorMessage, stack: errorStack })
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
