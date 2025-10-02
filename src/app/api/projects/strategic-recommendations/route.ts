import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

// GET /api/projects/strategic-recommendations - Get strategic recommendations based on user's projects and goals
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

    console.log('Generating strategic recommendations for user:', user.id)

    // Fetch user's projects (weekly_goals)
    const { data: projects, error: projectsError } = await supabase
      .from('weekly_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_completed', false)
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
      .eq('status', 'pending')
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
    }))

    const taskData = (tasks || []).map((t) => ({
      title: t.title,
      description: t.description,
      category: t.category,
      priority: t.priority,
      points_value: t.points_value,
    }))

    // Create a comprehensive prompt for strategic analysis
    const currentTime = new Date().toISOString()
    const randomFocusAreas = [
      'risk mitigation',
      'market positioning',
      'efficiency optimization',
      'competitive advantage',
      'resource allocation',
      'timeline acceleration',
    ]
    const randomFocusArea = randomFocusAreas[Math.floor(Math.random() * randomFocusAreas.length)]

    const prompt = `
You are a strategic business advisor analyzing a user's project portfolio to provide high-level strategic recommendations.

CURRENT CONTEXT:
- Current Time: ${currentTime}
- Focus Area: ${randomFocusArea}
- User has ${projectData.length} active projects, ${goalData.length} goals, and ${taskData.length} pending tasks

USER'S PROJECTS:
${projectData.map((p) => `- ${p.title}: ${p.description} (Category: ${p.category}, Progress: ${p.progress}%, Current Points: ${p.points_value}/${p.target_points}, Current Value: $${p.money_value}/$${p.target_money})`).join('\n')}

USER'S GOALS:
${goalData.map((g) => `- ${g.title}: ${g.description} (Type: ${g.goal_type}, Priority: ${g.priority_level}, Status: ${g.status}, Target: ${g.target_date}, Progress: ${g.current_value}/${g.target_value})`).join('\n')}

USER'S PENDING TASKS:
${taskData.map((t) => `- ${t.title}: ${t.description} (Category: ${t.category}, Priority: ${t.priority}, Points: ${t.points_value})`).join('\n')}

STRATEGIC ANALYSIS REQUEST:
Based on the user's current project portfolio, provide ONE strategic recommendation that could significantly impact their success. Focus on ${randomFocusArea} and consider:

1. Cross-project synergies and opportunities
2. Risk mitigation strategies
3. Market positioning improvements
4. Efficiency gains across multiple projects
5. Competitive advantages
6. Resource optimization
7. Timeline acceleration opportunities

REQUIREMENTS:
- Provide a specific, actionable strategic recommendation
- Explain the potential impact and value
- Consider both high-reward and calculated risk opportunities
- Make it relevant to their current project mix
- Be creative and think outside the box
- Keep it concise but impactful (2-3 sentences)
- Focus on strategic thinking, not just task completion

FORMAT YOUR RESPONSE AS:
"STRATEGIC INSIGHT: [Your strategic recommendation here]"

Be bold, strategic, and forward-thinking. Consider opportunities they might not have seen yet.
`

    console.log('Calling OpenAI with prompt length:', prompt.length)

    const { text } = await generateText({
      model: openai('gpt-3.5-turbo'),
      prompt,
      temperature: 0.9, // High creativity for strategic thinking
    })

    console.log('OpenAI response received')

    return NextResponse.json(
      {
        recommendation: text,
        focusArea: randomFocusArea,
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
