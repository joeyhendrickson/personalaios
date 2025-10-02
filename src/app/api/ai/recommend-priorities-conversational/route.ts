import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { z } from 'zod'

const conversationalPrioritySchema = z.object({
  daily_intention: z.string().min(1).max(500),
  energy_level: z.enum(['high', 'medium', 'low']).optional(),
  time_available: z.enum(['full_day', 'half_day', 'few_hours']).optional(),
  focus_area: z.string().optional(),
})

// POST /api/ai/recommend-priorities-conversational - Generate AI priorities based on user's daily intention
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

    const body = await request.json()
    const { daily_intention, energy_level, time_available, focus_area } =
      conversationalPrioritySchema.parse(body)

    console.log(
      'Generating conversational priorities for user:',
      user.id,
      'with intention:',
      daily_intention
    )

    // Fetch complete dashboard context for holistic AI recommendations
    console.log('Fetching user data...')
    const [
      goalsResult,
      projectsResult,
      tasksResult,
      completedProjectsResult,
      completedTasksResult,
      existingPrioritiesResult,
      habitsResult,
      educationResult,
      accomplishmentsResult,
      pointsHistoryResult,
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
        .eq('is_completed', false)
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
        .eq('is_completed', true)
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

      // Fetch existing priorities to avoid duplicates
      supabase
        .from('priorities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),

      // Fetch habits for context
      supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),

      // Fetch education items for context
      supabase
        .from('education')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),

      // Fetch recent accomplishments for context
      supabase
        .from('accomplishments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),

      // Fetch points history for context
      supabase
        .from('points_ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),

      // Fetch installed modules/lifehacks for context
      supabase
        .from('installed_modules')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('last_accessed', { ascending: false }),
    ])

    const goals = goalsResult.data || []
    const projects = projectsResult.data || []
    const tasks = tasksResult.data || []
    const completedProjects = completedProjectsResult.data || []
    const completedTasks = completedTasksResult.data || []
    const existingPriorities = existingPrioritiesResult.data || []
    const habits = habitsResult.data || []
    const education = educationResult.data || []
    const accomplishments = accomplishmentsResult.data || []
    const pointsHistory = pointsHistoryResult.data || []
    const installedModules = installedModulesResult.data || []

    console.log(
      'Data fetched - Goals:',
      goals.length,
      'Projects:',
      projects.length,
      'Tasks:',
      tasks.length,
      'Completed Projects:',
      completedProjects.length,
      'Completed Tasks:',
      completedTasks.length,
      'Existing Priorities:',
      existingPriorities.length,
      'Habits:',
      habits.length,
      'Education:',
      education.length,
      'Accomplishments:',
      accomplishments.length,
      'Points History:',
      pointsHistory.length,
      'Installed Modules:',
      installedModules.length
    )

    // Check for errors in data fetching
    if (goalsResult.error) {
      console.error('Error fetching goals:', goalsResult.error)
      return NextResponse.json(
        {
          error: 'Failed to fetch goals',
          details: goalsResult.error.message,
        },
        { status: 500 }
      )
    }
    if (projectsResult.error) {
      console.error('Error fetching projects:', projectsResult.error)
      return NextResponse.json(
        {
          error: 'Failed to fetch projects',
          details: projectsResult.error.message,
        },
        { status: 500 }
      )
    }
    if (tasksResult.error) {
      console.error('Error fetching tasks:', tasksResult.error)
      return NextResponse.json(
        {
          error: 'Failed to fetch tasks',
          details: tasksResult.error.message,
        },
        { status: 500 }
      )
    }

    if (goals.length === 0 && projects.length === 0) {
      return NextResponse.json(
        {
          message:
            'No active goals or projects found. Please create goals or projects first to generate AI recommendations.',
          priorities: [],
        },
        { status: 200 }
      )
    }

    // Get current date and day of week for context
    const today = new Date()
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' })
    const isWeekend = today.getDay() === 0 || today.getDay() === 6

    // Separate fires items (they're handled separately)
    const firesProjects = projects.filter((p) => p.category === 'fires')
    const firesTasks = tasks.filter((t) => t.category === 'fires')

    // Get IDs of items that already have priorities to avoid duplicates
    const existingProjectIds = existingPriorities
      .filter((p) => p.project_id)
      .map((p) => p.project_id)
    const existingTaskIds = existingPriorities.filter((p) => p.task_id).map((p) => p.task_id)

    // Filter out items that already have priorities
    const nonFiresProjects = projects.filter(
      (p) => p.category !== 'fires' && !existingProjectIds.includes(p.id)
    )
    const nonFiresTasks = tasks.filter(
      (t) => t.category !== 'fires' && !existingTaskIds.includes(t.id)
    )

    // Create AI prompt with user's daily intention and holistic dashboard context
    const prompt = `
You are an AI productivity assistant helping prioritize tasks and projects for TODAY based on the user's specific daily intention.

USER'S DAILY INTENTION: "${daily_intention}"
${energy_level ? `ENERGY LEVEL: ${energy_level}` : ''}
${time_available ? `TIME AVAILABLE: ${time_available}` : ''}
${focus_area ? `FOCUS AREA: ${focus_area}` : ''}

CONTEXT:
- Today is ${dayOfWeek}${isWeekend ? ' (weekend)' : ' (workday)'}
- Focus on 3-5 actionable priorities that align with the user's stated intention
- FIRES items are URGENT and should be prioritized appropriately based on the user's intention
- IMPORTANT: Do NOT recommend priorities for completed items - they are already done
- You have COMPLETE DASHBOARD CONTEXT below - use it to make holistic, strategic recommendations

DASHBOARD OVERVIEW:
- High-Level Goals: ${goals.length} active goals
- Active Projects: ${projects.length} projects  
- Active Tasks: ${tasks.length} tasks
- Daily Habits: ${habits.length} habits tracked
- Education Items: ${education.length} learning items
- Recent Accomplishments: ${accomplishments.length} recent wins
- Points Earned: ${pointsHistory.length} recent point activities
- Installed Life Hacks: ${installedModules.length} active modules

GOALS (in priority order):
${goals.map((goal, i) => `${i + 1}. ${goal.title} (${goal.goal_type}) - Target: ${goal.target_value} ${goal.target_unit || ''} - Current: ${goal.current_value} - Priority: ${goal.priority_level}/5`).join('\n')}

ACTIVE PROJECTS (excluding fires):
${nonFiresProjects.map((project) => `- ${project.title} (${project.category}) - ${project.current_points}/${project.target_points} points`).join('\n')}

ACTIVE TASKS (excluding fires):
${nonFiresTasks.map((task) => `- ${task.title} (${task.category}) - ${task.points_value} points - Project: ${task.project_title || 'Standalone'}`).join('\n')}

RECENTLY COMPLETED ITEMS (for context - DO NOT include these in recommendations):
${completedProjects.length > 0 ? `COMPLETED PROJECTS:\n${completedProjects.map((project) => `✅ ${project.title} (${project.category}) - Completed`).join('\n')}\n` : 'No recently completed projects'}
${completedTasks.length > 0 ? `COMPLETED TASKS:\n${completedTasks.map((task) => `✅ ${task.title} (${task.category}) - Completed`).join('\n')}\n` : 'No recently completed tasks'}

EXISTING PRIORITIES (already set - DO NOT duplicate these):
${existingPriorities.length > 0 ? `CURRENT PRIORITIES:\n${existingPriorities.map((priority) => `🔥 ${priority.title} (${priority.priority_type}) - Score: ${priority.priority_score}`).join('\n')}\n` : 'No existing priorities'}

DAILY HABITS (for context - consider habit completion in recommendations):
${habits.length > 0 ? `TRACKED HABITS:\n${habits.map((habit) => `- ${habit.title} (${habit.category}) - ${habit.frequency}`).join('\n')}\n` : 'No habits tracked'}

EDUCATION/LEARNING (for context - consider learning goals):
${education.length > 0 ? `LEARNING ITEMS:\n${education.map((item) => `- ${item.title} (${item.category}) - ${item.status}`).join('\n')}\n` : 'No education items'}

RECENT ACCOMPLISHMENTS (for motivation context):
${accomplishments.length > 0 ? `RECENT WINS:\n${accomplishments.map((acc) => `✅ ${acc.title} (${acc.type})`).join('\n')}\n` : 'No recent accomplishments'}

RECENT ACTIVITY (points earned):
${
  pointsHistory.length > 0
    ? `RECENT POINTS:\n${pointsHistory
        .slice(0, 5)
        .map((point) => `+${point.points} - ${point.description}`)
        .join('\n')}\n`
    : 'No recent point activity'
}

INSTALLED LIFE HACKS/MODULES (for context - consider how priorities can leverage these tools):
${installedModules.length > 0 ? `ACTIVE MODULES:\n${installedModules.map((module) => `- ${module.module_id} (Last used: ${new Date(module.last_accessed).toLocaleDateString()})`).join('\n')}\n` : 'No modules installed'}

🔥 FIRES (URGENT - Handle these first):
${firesProjects.length > 0 ? `FIRE PROJECTS:\n${firesProjects.map((project) => `- ${project.title} - ${project.current_points}/${project.target_points} points`).join('\n')}` : 'No fire projects'}
${firesTasks.length > 0 ? `FIRE TASKS:\n${firesTasks.map((task) => `- ${task.title} - ${task.points_value} points`).join('\n')}` : 'No fire tasks'}

STRATEGIC PRIORITY RECOMMENDATIONS:
Using the COMPLETE DASHBOARD CONTEXT and user's intention "${daily_intention}", recommend 3-5 strategic priorities that:

1. **INTENTION-ALIGNED**: DIRECTLY support their stated intention "${daily_intention}"
2. **HOLISTIC APPROACH**: Consider the entire dashboard - goals, projects, tasks, habits, education, modules, and recent activity
3. **STRATEGIC FOCUS**: Choose priorities that create the most impact across multiple areas
4. **ENERGY & TIME OPTIMIZED**: Match their ${energy_level || 'medium'} energy level and ${time_available || 'full day'} availability
5. **COMPLEMENTARY**: Work WITH existing priorities, not against them - build momentum
6. **REALISTIC SCOPE**: Be appropriate for a ${dayOfWeek}${isWeekend ? ' (weekend)' : ' (workday)'}
7. **ACTIONABLE**: Have clear, specific next steps that can be completed today
8. **NON-DUPLICATIVE**: ONLY include items from ACTIVE PROJECTS/TASKS that don't already have priorities
9. **GOAL-ALIGNED**: Directly advance the highest-priority goals from the list above
10. **HABIT-SUPPORTING**: Consider how priorities can support or complement daily habits
11. **LEARNING-ENHANCED**: Factor in education goals and recent accomplishments for motivation
12. **MODULE-LEVERAGING**: Consider how installed life hacks can help accomplish priorities more efficiently

AVOID:
- Duplicating existing priorities (check EXISTING PRIORITIES list)
- Recommending completed items
- Creating overlapping or redundant recommendations
- Ignoring the broader dashboard context
- Ignoring the user's specific daily intention

🔥 FIRES HANDLING STRATEGY:
- If user wants to REST/RELAX: Remind them about fires first, encourage quick completion before rest
- If user wants to FOCUS on specific area: Include relevant fires that align with their focus
- If user has HIGH energy: Prioritize fires that need significant effort
- If user has LOW energy: Focus on quick, easy fires first
- If user has LIMITED time: Prioritize the most critical fires
- Always acknowledge fires in your recommendations with context about why they matter

PRIORITY SCORING:
- 90-95: Fires that align with daily intention
- 85-90: Fires that need attention regardless of intention
- 70-85: High alignment with daily intention + important goals
- 60-75: Good alignment with daily intention or important goals
- 50-65: Moderate alignment, but still valuable

CATEGORY MAPPINGS:
- Financial focus: prioritize "quick_money", "save_money", "business_growth", "business_launch"
- Health focus: prioritize "health", "good_living" categories
- Career focus: prioritize "job", "network_expansion", "business_growth"
- Personal development: prioritize "learning", "innovation", "big_vision"
- Organization: prioritize "organization", "productivity"
- Rest/Recovery: prioritize low-energy, health, or personal tasks

For each priority:
1. Give it a clear, actionable title that connects to their intention
2. Explain how it supports their daily intention AND their goals
3. Assign a priority score based on alignment
4. Specify which project/task it relates to (if any)
5. Consider their energy level and time constraints
6. If it's a fire item, explain why it's urgent and how it fits their intention

IMPORTANT: Include fires in your recommendations when appropriate:
- If user wants to rest: "Complete [fire task] quickly so you can rest peacefully"
- If user wants to focus on money: "Handle [fire task] to avoid financial consequences"
- If user has high energy: "Tackle [fire project] while you have the energy"
- If user has limited time: "Quickly resolve [fire task] to free up mental space"

Return as JSON array:
[
  {
    "title": "Actionable priority that connects to their intention",
    "description": "How this supports their daily intention AND their goals (include fire context if applicable)",
    "priority_score": 75,
    "source_type": "project|task|manual",
    "source_id": "uuid-if-applicable",
    "goal_id": "uuid-of-supporting-goal"
  }
]

Focus on creating priorities that make the user feel like they're making progress on what they want to focus on today, while being responsible about urgent fires.
`

    // Call OpenAI using the same approach as the working chat API
    console.log('Calling OpenAI with prompt length:', prompt.length)

    // Use available model from your API key
    console.log('Calling OpenAI with available model: gpt-4.1-mini')
    const { text: aiResponse } = await generateText({
      model: openai('gpt-4.1-mini'),
      messages: [
        {
          role: 'system',
          content:
            'You are a productivity expert who creates personalized daily priorities based on user intentions and goals. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    })
    console.log('OpenAI response received')

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
        priority_score: Math.min(100, Math.max(0, priority.priority_score)),
        order_index: index + 1,
        is_completed: false,
      }))

    // Clear existing AI recommendations and insert new ones
    console.log('Clearing existing AI recommendations...')
    const { error: deleteError } = await supabase
      .from('priorities')
      .delete()
      .eq('user_id', user.id)
      .eq('priority_type', 'ai_recommended')

    if (deleteError) {
      console.error('Error deleting existing priorities:', deleteError)
      return NextResponse.json(
        {
          error: 'Failed to clear existing priorities',
          details: deleteError.message,
          code: deleteError.code,
        },
        { status: 500 }
      )
    }

    if (validPriorities.length > 0) {
      console.log('Inserting priorities:', validPriorities.length, 'items')
      const prioritiesToInsert = validPriorities.map((priority: any) => ({
        user_id: user.id,
        ...priority,
      }))
      console.log('Sample priority to insert:', prioritiesToInsert[0])

      const { error: insertError } = await supabase.from('priorities').insert(prioritiesToInsert)

      if (insertError) {
        console.error('Error inserting AI priorities:', insertError)
        return NextResponse.json(
          {
            error: 'Failed to save AI recommendations',
            details: insertError.message,
            code: insertError.code,
          },
          { status: 500 }
        )
      }
      console.log('Successfully inserted AI priorities')
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
        message: `Generated ${validPriorities.length} AI-recommended priorities based on your intention: "${daily_intention}"`,
        priorities: validPriorities,
        daily_intention: daily_intention,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: error.issues,
        },
        { status: 400 }
      )
    }
    console.error('Error generating conversational AI priorities:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate AI recommendations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
