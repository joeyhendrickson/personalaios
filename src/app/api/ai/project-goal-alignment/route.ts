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

    // Fetch user's goals and projects
    const { data: goals, error: goalsError } = await supabase
      .from('weekly_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_completed', false)

    if (goalsError) {
      console.error('Error fetching goals:', goalsError)
      return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
    }

    // Fetch user's tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending'])

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    // Fetch user's habits
    const { data: habits, error: habitsError } = await supabase
      .from('daily_habits')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (habitsError) {
      console.error('Error fetching habits:', habitsError)
      return NextResponse.json({ error: 'Failed to fetch habits' }, { status: 500 })
    }

    // Fetch user's priorities
    const { data: priorities, error: prioritiesError } = await supabase
      .from('priorities')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_completed', false)
      .order('order_index', { ascending: true })

    if (prioritiesError) {
      console.error('Error fetching priorities:', prioritiesError)
      return NextResponse.json({ error: 'Failed to fetch priorities' }, { status: 500 })
    }

    // Calculate progress metrics
    const totalTargetPoints = goals.reduce((sum, goal) => sum + (goal.target_points || 0), 0)
    const totalCurrentPoints = goals.reduce((sum, goal) => sum + (goal.current_points || 0), 0)
    const progressPercentage =
      totalTargetPoints > 0 ? Math.round((totalCurrentPoints / totalTargetPoints) * 100) : 0

    // Calculate points by category
    const categoryPoints = [...goals, ...tasks].reduce(
      (acc, item) => {
        const category = item.category
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

    // Generate AI assessment
    const prompt = `You are a personal productivity and goal achievement expert. Analyze this user's current project-goal alignment and provide actionable insights.

USER'S CURRENT SITUATION:
- Total Progress: ${progressPercentage}% (${totalCurrentPoints}/${totalTargetPoints} points)
- Active Goals: ${goals.length}
- Active Tasks: ${tasks.length}
- Active Habits: ${habits.length}
- Current Priorities: ${priorities.length}

GOALS BREAKDOWN:
${goals.map((goal) => `- ${goal.title}: ${goal.current_points || 0}/${goal.target_points} points (${goal.category})`).join('\n')}

TASKS BREAKDOWN:
${tasks.map((task) => `- ${task.title}: ${task.status} (${task.category})`).join('\n')}

HABITS BREAKDOWN:
${habits.map((habit) => `- ${habit.title}: ${habit.weekly_completion_count || 0} times this week`).join('\n')}

PRIORITIES:
${priorities.map((priority) => `- ${priority.title}: Level ${priority.priority_level}`).join('\n')}

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

    const { text } = await generateText({
      model: openai('gpt-3.5-turbo'),
      prompt,
    })

    let assessment
    try {
      assessment = JSON.parse(text)
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
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
    }

    return NextResponse.json({ assessment })
  } catch (error) {
    console.error('Error in project-goal alignment API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
