import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// POST /api/ai/recommend-priorities - Generate AI-recommended priorities based on goals
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

    // Fetch user's goals, projects, and tasks (including completed items for context)
    const [
      goalsResult,
      projectsResult,
      tasksResult,
      completedProjectsResult,
      completedTasksResult,
    ] = await Promise.all([
      supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('priority_level', { ascending: true }),

      supabase
        .from('weekly_goals')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'completed')
        .order('created_at', { ascending: false }),

      supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),

      // Fetch completed projects for context
      supabase
        .from('weekly_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(10), // Recent completed projects

      // Fetch completed tasks for context
      supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(20), // Recent completed tasks
    ])

    const goals = goalsResult.data || []
    const projects = projectsResult.data || []
    const tasks = tasksResult.data || []
    const completedProjects = completedProjectsResult.data || []
    const completedTasks = completedTasksResult.data || []

    if (goals.length === 0) {
      return NextResponse.json(
        {
          message:
            'No active goals found. Please create goals first to generate AI recommendations.',
          priorities: [],
        },
        { status: 200 }
      )
    }

    // Prepare context for AI
    const context = {
      goals: goals.map((goal) => ({
        title: goal.title,
        description: goal.description,
        type: goal.goal_type,
        target_value: goal.target_value,
        target_unit: goal.target_unit,
        current_value: goal.current_value,
        priority_level: goal.priority_level,
        target_date: goal.target_date,
      })),
      projects: projects.map((project) => ({
        title: project.title,
        description: project.description,
        category: project.category,
        target_points: project.target_points,
        current_points: project.current_points,
        target_money: project.target_money,
      })),
      tasks: tasks.map((task) => ({
        title: task.title,
        description: task.description,
        category: task.category,
        points_value: task.points_value,
        money_value: task.money_value,
        project_title: projects.find((p) => p.id === task.weekly_goal_id)?.title,
      })),
    }

    // Get current date and day of week for context
    const today = new Date()
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' })
    const isWeekend = today.getDay() === 0 || today.getDay() === 6

    // Separate fires items (they're handled separately)
    const firesProjects = projects.filter((p) => p.category === 'fires')
    const firesTasks = tasks.filter((t) => t.category === 'fires')
    const nonFiresProjects = projects.filter((p) => p.category !== 'fires')
    const nonFiresTasks = tasks.filter((t) => t.category !== 'fires')

    // Create AI prompt
    const prompt = `
You are an AI productivity assistant helping prioritize tasks and projects for TODAY (${dayOfWeek}${isWeekend ? ' - Weekend' : ''}).

CONTEXT:
- Today is ${dayOfWeek}${isWeekend ? ' (weekend - focus on personal development, health, or low-pressure tasks)' : ' (workday - focus on high-impact professional tasks)'}
- Fires category items are handled separately and will be auto-included
- Focus on 3-5 actionable priorities for today
- IMPORTANT: Do NOT recommend priorities for completed items - they are already done

GOALS (in priority order):
${goals.map((goal, i) => `${i + 1}. ${goal.title} (${goal.goal_type}) - Target: ${goal.target_value} ${goal.target_unit || ''} - Current: ${goal.current_value} - Priority: ${goal.priority_level}/5`).join('\n')}

ACTIVE PROJECTS (excluding fires - they're handled separately):
${nonFiresProjects.map((project) => `- ${project.title} (${project.category}) - ${project.current_points}/${project.target_points} points`).join('\n')}

ACTIVE TASKS (excluding fires - they're handled separately):
${nonFiresTasks.map((task) => `- ${task.title} (${task.category}) - ${task.points_value} points - Project: ${task.project_title || 'Standalone'}`).join('\n')}

RECENTLY COMPLETED ITEMS (for context - DO NOT include these in recommendations):
${completedProjects.length > 0 ? `COMPLETED PROJECTS:\n${completedProjects.map((project) => `✅ ${project.title} (${project.category}) - Completed`).join('\n')}\n` : 'No recently completed projects'}
${completedTasks.length > 0 ? `COMPLETED TASKS:\n${completedTasks.map((task) => `✅ ${task.title} (${task.category}) - Completed`).join('\n')}\n` : 'No recently completed tasks'}

DAILY CONTEXT RULES:
- Weekdays: Prioritize work-related, high-impact tasks that advance major goals
- Weekends: Focus on personal development, health, learning, or relationship-building
- Consider energy levels: Morning = high-focus tasks, Afternoon = medium tasks, Evening = low-energy tasks
- Balance urgent vs important: Don't just pick urgent tasks, pick ones that move the needle

CATEGORY MAPPINGS:
- Financial goals: prioritize "quick_money", "save_money", "business_growth", "business_launch" categories
- Health goals: prioritize "health" category  
- Career goals: prioritize "job", "network_expansion", "business_growth" categories
- Personal development: prioritize "learning", "innovation", "big_vision" categories
- Organization: prioritize "organization", "productivity" categories

Please recommend 3-5 specific priorities for TODAY that will:
1. Advance your highest-priority goals
2. Be appropriate for a ${dayOfWeek}${isWeekend ? ' (weekend)' : ' (workday)'}
3. Be realistically completable today
4. Have clear, actionable next steps
5. ONLY include items from the ACTIVE PROJECTS and ACTIVE TASKS lists above
6. DO NOT recommend anything from the COMPLETED ITEMS - acknowledge them in your reasoning but don't suggest them as priorities

For each priority:
1. Give it a clear, actionable title (start with action verb)
2. Explain why it's important for today specifically
3. Assign a priority score (60-85, since fires get 90-95)
4. Specify which project/task it relates to (if any)
5. Consider today's context and energy

Return as JSON array with this structure:
[
  {
    "title": "Actionable priority title",
    "description": "Why this is important for today specifically",
    "priority_score": 75,
    "source_type": "project|task|manual",
    "source_id": "uuid-if-applicable",
    "goal_id": "uuid-of-supporting-goal"
  }
]

Focus on TODAY's most impactful actions that advance your top goals.
`

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are a productivity expert who analyzes goals and creates actionable priorities. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const aiResponse = completion.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    // Parse AI response
    let recommendedPriorities
    try {
      recommendedPriorities = JSON.parse(aiResponse)
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      console.error('AI response:', aiResponse)
      throw new Error('Invalid AI response format')
    }

    // Validate and clean the recommendations
    const validPriorities = recommendedPriorities
      .filter((priority: any) => priority.title && priority.description && priority.priority_score)
      .map((priority: any, index: number) => ({
        title: priority.title,
        description: priority.description,
        priority_type: 'ai_recommended' as const,
        source_type: priority.source_type || 'manual',
        source_id: priority.source_id || null,
        goal_id: priority.goal_id || null,
        project_id: priority.source_type === 'project' ? priority.source_id : null,
        task_id: priority.source_type === 'task' ? priority.source_id : null,
        priority_score: Math.min(100, Math.max(0, priority.priority_score)),
        manual_order: index + 1,
      }))

    // Clear existing AI recommendations and insert new ones
    await supabase
      .from('priorities')
      .delete()
      .eq('user_id', user.id)
      .eq('priority_type', 'ai_recommended')

    if (validPriorities.length > 0) {
      const { error: insertError } = await supabase.from('priorities').insert(
        validPriorities.map((priority: any) => ({
          user_id: user.id,
          ...priority,
        }))
      )

      if (insertError) {
        console.error('Error inserting AI priorities:', insertError)
        return NextResponse.json({ error: 'Failed to save AI recommendations' }, { status: 500 })
      }
    }

    // Also sync fires priorities to ensure they're included
    try {
      const firesResponse = await fetch(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/priorities/sync-fires`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${request.headers.get('authorization')}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (firesResponse.ok) {
        const firesData = await firesResponse.json()
        console.log('Fires priorities synced:', firesData.count)
      }
    } catch (firesError) {
      console.error('Error syncing fires priorities:', firesError)
      // Don't fail the main request if fires sync fails
    }

    return NextResponse.json(
      {
        message: `Generated ${validPriorities.length} AI-recommended priorities`,
        priorities: validPriorities,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error generating AI priorities:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate AI recommendations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
