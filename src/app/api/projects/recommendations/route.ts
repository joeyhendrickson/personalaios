import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's active goals (projects) - prioritize by priority and deadline
    const { data: goals, error: goalsError } = await supabase
      .from('weekly_goals')
      .select(
        'id, title, description, category, current_points, target_points, priority, deadline, is_completed'
      )
      .eq('user_id', user.id)
      .eq('is_completed', false)
      .order('priority', { ascending: false })
      .order('deadline', { ascending: true })
      .order('created_at', { ascending: false })

    if (goalsError) {
      console.error('Error fetching goals:', goalsError)
      return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
    }

    console.log('Successfully fetched goals:', goals?.length || 0)

    // Fetch user's pending tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, description, category, status')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    // Calculate overall project completion rate
    const totalTargetPoints = goals.reduce((sum, goal) => sum + (goal.target_points || 0), 0)
    const totalCurrentPoints = goals.reduce((sum, goal) => sum + (goal.current_points || 0), 0)
    const overallCompletionRate =
      totalTargetPoints > 0 ? Math.round((totalCurrentPoints / totalTargetPoints) * 100) : 0

    // Get projects for focused recommendations with some randomization
    const topPriorityProjects = goals.slice(0, 3)
    const highPriorityProjects = goals.filter(
      (goal) => goal.priority === 'high' || goal.priority === 1
    )

    // Add randomization to focus projects selection
    const allProjects = goals.length > 0 ? goals : []
    const shuffledProjects = [...allProjects].sort(() => Math.random() - 0.5)
    const randomFocusProjects = shuffledProjects.slice(0, Math.min(2, shuffledProjects.length))

    const focusProjects =
      highPriorityProjects.length > 0
        ? [...highPriorityProjects, ...randomFocusProjects].slice(0, 3)
        : randomFocusProjects.length > 0
          ? randomFocusProjects
          : topPriorityProjects

    // Add timestamp and random elements for variety
    const currentTime = new Date().toISOString()
    const randomSeed = Math.floor(Math.random() * 1000)
    const focusAreas = [
      'planning',
      'execution',
      'review',
      'optimization',
      'communication',
      'research',
    ]
    const randomFocusArea = focusAreas[Math.floor(Math.random() * focusAreas.length)]

    // Generate AI recommendations with randomization
    const prompt = `You are a productivity expert analyzing a user's projects. Generate a fresh, specific task recommendation. Current time: ${currentTime}. Focus area: ${randomFocusArea}.

FOCUS PROJECTS (Prioritize these):
${focusProjects.map((goal) => `- ${goal.title} (${goal.category}) - Progress: ${goal.current_points || 0}/${goal.target_points || 0} points - Priority: ${goal.priority || 'Medium'} - Deadline: ${goal.deadline || 'No deadline'}`).join('\n')}

ALL ACTIVE PROJECTS (${goals.length} total):
${goals.map((goal) => `- ${goal.title} (${goal.category}) - Priority: ${goal.priority || 'Medium'}`).join('\n')}

PENDING TASKS (${tasks.length} total):
${tasks
  .slice(0, 10)
  .map((task) => `- ${task.title} (${task.category}) - Status: ${task.status}`)
  .join('\n')}

OVERALL COMPLETION RATE: ${overallCompletionRate}%

Generate a DIFFERENT recommendation this time. Consider:
1. Focus on the ${randomFocusArea} aspect of the priority projects
2. Think about what would be most valuable RIGHT NOW
3. Consider both quick wins and strategic moves
4. Vary your approach - don't repeat previous suggestions
5. Be creative and specific about the next actionable step

Respond with a JSON array of exactly 1 recommendation:
- title: Short, actionable task title (be specific and varied)
- description: Brief explanation of why this task is important NOW
- priority: "high", "medium", or "low"
- impact: "quick_win", "high_impact", or "strategic"
- estimated_time: "15min", "30min", "1hour", "2hours", or "half_day"

Example format:
[
  {
    "title": "Draft initial outline for [specific project]",
    "description": "Creating a structured plan will accelerate progress on this high-priority project",
    "priority": "high",
    "impact": "high_impact",
    "estimated_time": "30min"
  }
]`

    try {
      const result = await generateText({
        model: openai('gpt-4o-mini'),
        messages: [
          {
            role: 'system',
            content:
              'You are a productivity expert who provides specific, actionable task recommendations. Always respond with valid JSON. Be creative and varied in your suggestions - avoid repeating similar recommendations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.9, // Higher temperature for more creative/varied responses
      })

      let recommendations
      try {
        recommendations = JSON.parse(result.text)
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError)
        // Fallback recommendations
        recommendations = [
          {
            title: 'Review project priorities',
            description: 'Assess which projects need immediate attention',
            priority: 'high',
            impact: 'strategic',
            estimated_time: '30min',
          },
        ]
      }

      return NextResponse.json({
        overallCompletionRate,
        totalProjects: goals.length,
        totalTasks: tasks.length,
        recommendations: recommendations.slice(0, 1), // Limit to 1 recommendation for compact layout
      })
    } catch (aiError) {
      console.error('AI recommendation error:', aiError)
      // Return fallback data without AI recommendations
      return NextResponse.json({
        overallCompletionRate,
        totalProjects: goals.length,
        totalTasks: tasks.length,
        recommendations: [
          {
            title: 'Review project status',
            description: 'Check progress on all active projects',
            priority: 'medium',
            impact: 'strategic',
            estimated_time: '30min',
          },
        ],
      })
    }
  } catch (error) {
    console.error('Unexpected error in project recommendations:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
