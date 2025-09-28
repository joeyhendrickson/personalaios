import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

// GET /api/projects/strategic-completion-recommendations - Get strategic recommendations for improving project completion
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

    console.log('Generating strategic completion recommendations for user:', user.id)

    // Fetch user's projects (weekly_goals)
    const { data: projects, error: projectsError } = await supabase
      .from('weekly_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (projectsError) {
      console.error('Error fetching projects:', projectsError)
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
    }

    // Fetch user's goals
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (goalsError) {
      console.error('Error fetching goals:', goalsError)
      return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
    }

    // Fetch user's tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    console.log(
      'Data fetched - Projects:',
      projects?.length || 0,
      'Goals:',
      goals?.length || 0,
      'Tasks:',
      tasks?.length || 0
    )

    // Prepare data for AI analysis
    const projectData = (projects || []).map((p) => ({
      title: p.title,
      description: p.description,
      category: p.category,
      progress:
        p.current_points && p.target_points
          ? Math.round((p.current_points / p.target_points) * 100)
          : 0,
      points_value: p.current_points,
      money_value: p.current_money,
      target_points: p.target_points,
      target_money: p.target_money,
      is_completed: p.is_completed,
      created_at: p.created_at,
    }))

    const goalData = (goals || []).map((g) => ({
      title: g.title,
      description: g.description,
      goal_type: g.goal_type,
      target_date: g.target_date,
      priority_level: g.priority_level,
      status: g.status,
      target_value: g.target_value,
      current_value: g.current_value,
      created_at: g.created_at,
    }))

    const taskData = (tasks || []).map((t) => ({
      title: t.title,
      description: t.description,
      category: t.category,
      priority: t.priority,
      points_value: t.points_value,
      status: t.status,
      created_at: t.created_at,
    }))

    // Calculate completion metrics
    const completedProjects = projectData.filter((p) => p.is_completed).length
    const totalProjects = projectData.length
    const completionRate =
      totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0

    const completedTasks = taskData.filter((t) => t.status === 'completed').length
    const totalTasks = taskData.length
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // Create a comprehensive prompt for strategic analysis
    const currentTime = new Date().toISOString()
    const randomFocusAreas = [
      'project alignment',
      'completion acceleration',
      'resource optimization',
      'priority management',
      'timeline efficiency',
      'goal synchronization',
    ]
    const randomFocusArea = randomFocusAreas[Math.floor(Math.random() * randomFocusAreas.length)]

    const prompt = `
You are a strategic project management advisor analyzing a user's project portfolio to provide actionable recommendations for improving completion rates and ensuring goal alignment.

CURRENT CONTEXT:
- Current Time: ${currentTime}
- Focus Area: ${randomFocusArea}
- Project Completion Rate: ${completionRate}% (${completedProjects}/${totalProjects} projects completed)
- Task Completion Rate: ${taskCompletionRate}% (${completedTasks}/${totalTasks} tasks completed)

USER'S GOALS:
${goalData.map((g) => `- ${g.title}: ${g.description} (Type: ${g.goal_type}, Priority: ${g.priority_level}, Status: ${g.status}, Target: ${g.target_date}, Progress: ${g.current_value}/${g.target_value})`).join('\n')}

USER'S PROJECTS:
${projectData.map((p) => `- ${p.title}: ${p.description} (Category: ${p.category}, Progress: ${p.progress}%, Current Points: ${p.points_value}/${p.target_points}, Current Value: $${p.money_value}/$${p.target_money}, Completed: ${p.is_completed})`).join('\n')}

USER'S TASKS:
${taskData.map((t) => `- ${t.title}: ${t.description} (Category: ${t.category}, Priority: ${t.priority}, Status: ${t.status}, Points: ${t.points_value})`).join('\n')}

STRATEGIC ANALYSIS REQUEST:
Based on the user's current project portfolio, provide ONE strategic recommendation that could significantly improve their project completion rates and ensure better alignment with their goals. Focus on ${randomFocusArea} and consider:

1. Project-to-goal alignment gaps
2. Completion bottlenecks and blockers
3. Resource allocation inefficiencies
4. Priority misalignment between projects and goals
5. Timeline optimization opportunities
6. Task-to-project relationship improvements
7. Progress acceleration strategies

REQUIREMENTS:
- Provide a specific, actionable strategic recommendation
- Explain how it will improve completion rates
- Address goal alignment issues
- Consider both immediate and long-term impact
- Make it relevant to their current project mix
- Be practical and implementable
- Keep it concise but impactful (2-3 sentences)
- Focus on strategic thinking for project completion

FORMAT YOUR RESPONSE AS:
"STRATEGIC INSIGHT: [Your strategic recommendation here]"

Be strategic, practical, and focused on measurable improvements to project completion and goal alignment.
`

    console.log('Calling OpenAI with prompt length:', prompt.length)

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.8, // High creativity for strategic thinking
    })

    console.log('OpenAI response received')

    return NextResponse.json(
      {
        recommendation: text,
        focusArea: randomFocusArea,
        completionRate,
        taskCompletionRate,
        timestamp: currentTime,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
