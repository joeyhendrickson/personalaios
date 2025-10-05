import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    console.log('Chat API called with messages:', messages.length)

    // Get user data for context
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Chat API auth error:', authError)
      return new Response('Unauthorized', { status: 401 })
    }

    console.log('Chat API user authenticated:', user.id)

    // Fetch user's dashboard data
    const [
      goalsResult,
      tasksResult,
      habitsResult,
      educationResult,
      prioritiesResult,
      pointsResult,
      installedModulesResult,
    ] = await Promise.all([
      // Weekly goals
      supabase
        .from('weekly_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),

      // Tasks
      supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),

      // Daily habits
      supabase
        .from('daily_habits')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('order_index', { ascending: true }),

      // Education items
      supabase.from('education_items').select('*').eq('user_id', user.id).eq('is_active', true),

      // Priorities (exclude completed and deleted)
      supabase
        .from('priorities')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .eq('is_deleted', false)
        .order('priority_score', { ascending: false }),

      // Points data
      supabase
        .from('points_ledger')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()), // Last 7 days

      // Installed life hacks (modules)
      supabase
        .from('installed_modules')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('last_accessed', { ascending: false }),
    ])

    // Fetch data from installed life hack modules
    const installedModulesList = installedModulesResult.data || []

    // Fetch module-specific data based on installed modules
    const moduleDataPromises = installedModulesList.map(async (module) => {
      const moduleId = module.module_id

      try {
        // Define known tables for each module type
        const moduleTableMappings: Record<string, string[]> = {
          'fitness-tracker': [
            'fitness_goals',
            'fitness_stats',
            'fitness_progress',
            'fitness_insights',
          ],
          'budget-optimizer': [
            'budget_categories',
            'budget_goals',
            'budget_allocations',
            'budget_insights',
            'budget_periods',
          ],
          'day-trader': ['trading_analyses'],
          'relationship-manager': ['relationship_types', 'relationship_goals'],
          'grocery-optimizer': ['grocery_receipts', 'grocery_items'],
          'ai-coach': ['ai_coach_sessions', 'ai_coach_insights'],
          'time-blocker': ['time_blocks', 'time_block_sessions'],
        }

        // Get tables for this specific module, or try to discover them dynamically
        let moduleTables = moduleTableMappings[moduleId] || []

        // If no predefined tables, try common naming patterns
        if (moduleTables.length === 0) {
          const moduleName = moduleId.replace('-', '_')
          moduleTables = [
            `${moduleName}_goals`,
            `${moduleName}_data`,
            `${moduleName}_entries`,
            `${moduleName}_records`,
            `${moduleName}_stats`,
            `${moduleName}_progress`,
            `${moduleName}_analyses`,
            `${moduleName}_insights`,
            `${moduleName}_items`,
            `${moduleName}_categories`,
          ]
        }

        // Fetch data from all related tables
        const tableDataPromises = moduleTables.map(async (tableName: string) => {
          try {
            const { data, error } = await supabase
              .from(tableName)
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(20) // Limit to prevent huge responses

            if (error) {
              console.error(`Error fetching from ${tableName}:`, error)
              return { table: tableName, data: [], error: error.message }
            }

            return { table: tableName, data: data || [], count: data?.length || 0 }
          } catch (error) {
            console.error(`Error accessing table ${tableName}:`, error)
            return {
              table: tableName,
              data: [],
              error: error instanceof Error ? error.message : 'Unknown error',
            }
          }
        })

        const tableDataResults = await Promise.all(tableDataPromises)

        // Organize data by table
        const moduleData: Record<string, any> = {}
        let totalRecords = 0

        tableDataResults.forEach((result) => {
          if (result.data && result.data.length > 0) {
            moduleData[result.table] = result.data
            totalRecords += result.data.length
          }
        })

        return {
          module_id: moduleId,
          data: moduleData,
          tables_found: moduleTables.length,
          total_records: totalRecords,
          tables_queried: moduleTables,
        }
      } catch (error) {
        console.error(`Error fetching data for module ${moduleId}:`, error)
        return {
          module_id: moduleId,
          data: {},
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    })

    const moduleDataResults = await Promise.all(moduleDataPromises)

    const goals = goalsResult.data || []
    const tasks = tasksResult.data || []
    const habits = habitsResult.data || []
    const educationItems = educationResult.data || []
    const priorities = prioritiesResult.data || []
    const recentPoints = pointsResult.data || []
    const installedModules = installedModulesResult.data || []

    // Calculate current week's points
    const currentWeekStart = new Date()
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay())
    currentWeekStart.setHours(0, 0, 0, 0)

    const weeklyPoints = recentPoints
      .filter((point) => new Date(point.created_at) >= currentWeekStart)
      .reduce((sum, point) => sum + point.points, 0)

    // Get today's points
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dailyPoints = recentPoints
      .filter((point) => new Date(point.created_at) >= today)
      .reduce((sum, point) => sum + point.points, 0)

    // Analyze categories
    const goalCategories = [...new Set(goals.map((g) => g.category).filter(Boolean))]
    const taskCategories = [...new Set(tasks.map((t) => t.category).filter(Boolean))]
    const allCategories = [...new Set([...goalCategories, ...taskCategories])]

    // Check for "Good Living" category
    const hasGoodLiving = allCategories.some(
      (cat) =>
        cat.toLowerCase().includes('good') ||
        cat.toLowerCase().includes('living') ||
        cat.toLowerCase().includes('wellness') ||
        cat.toLowerCase().includes('health')
    )

    const userContext = {
      weeklyPoints,
      dailyPoints,
      totalGoals: goals.length,
      totalTasks: tasks.length,
      totalHabits: habits.length,
      totalEducationItems: educationItems.length,
      activePriorities: priorities.length,
      categories: allCategories,
      hasGoodLiving,
      goals: goals.slice(0, 5), // Top 5 goals for context
      recentTasks: tasks.slice(0, 10), // Recent 10 tasks
      habits: habits.slice(0, 5), // Top 5 habits
      priorities: priorities.slice(0, 5), // Top 5 priorities
      installedModules: installedModulesList.map((m) => m.module_id),
      moduleData: moduleDataResults,
    }

    console.log('Calling OpenAI with user context...')
    const result = await streamText({
      model: openai('gpt-4.1-mini'),
      messages,
      system: `You are an intelligent AI assistant for a Personal AI OS dashboard. You have access to the user's complete dashboard data and can provide personalized advice based on their goals, tasks, habits, education items, and priorities.

USER'S CURRENT DASHBOARD DATA:
- Weekly Points: ${userContext.weeklyPoints}
- Daily Points: ${userContext.dailyPoints}
- Total Goals: ${userContext.totalGoals}
- Total Tasks: ${userContext.totalTasks}
- Total Habits: ${userContext.totalHabits}
- Total Education Items: ${userContext.totalEducationItems}
- Active Priorities: ${userContext.activePriorities}
- Categories: ${userContext.categories.join(', ')}
- Has Good Living Category: ${userContext.hasGoodLiving}
- Installed Life Hacks: ${userContext.installedModules.join(', ') || 'None'}

RECENT GOALS:
${userContext.goals.map((g) => `- ${g.title} (${g.category}) - Progress: ${g.current_points}/${g.target_points}`).join('\n')}

RECENT TASKS:
${userContext.recentTasks.map((t) => `- ${t.title} (${t.category}) - Status: ${t.status}`).join('\n')}

ACTIVE HABITS:
${userContext.habits.map((h) => `- ${h.title}`).join('\n')}

TOP PRIORITIES:
${userContext.priorities.map((p) => `- ${p.title} - Priority Level: ${p.priority_score > 80 ? 'High' : p.priority_score > 60 ? 'Medium' : 'Low'}`).join('\n')}

LIFE HACKS DATA:
${userContext.moduleData
  .map((module) => {
    if (!module.data || Object.keys(module.data).length === 0) {
      return `- ${module.module_id}: No data available`
    }

    // Generate summary from all available tables for this module
    const tableSummaries = Object.entries(module.data)
      .map(([tableName, tableData]: [string, any]) => {
        const count = Array.isArray(tableData) ? tableData.length : 0
        return `${tableName} (${count} records)`
      })
      .join(', ')

    return `- ${module.module_id}: ${tableSummaries}`
  })
  .join('\n')}

CORE CAPABILITIES:
1. **Personalized Advice**: Analyze user's data to provide specific, actionable recommendations
2. **Category Analysis**: Understand user's focus areas and suggest improvements
3. **Task Creation**: Can suggest creating new tasks with appropriate value and priority
4. **Goal Alignment**: Help align daily activities with weekly goals
5. **Progress Tracking**: Reference current progress and suggest next steps
6. **Habit Integration**: Incorporate daily habits into recommendations
7. **Education Planning**: Reference education goals and suggest study plans
8. **Priority Management**: Help prioritize tasks based on current priorities
9. **Life Hacks Integration**: Leverage installed life hacks and their data for enhanced recommendations
10. **Cross-Module Synergy**: Connect insights from different life hack modules for holistic advice

SPECIAL FEATURES:
- **Happy Day Planning**: When user wants a "happy day", focus on "Good Living" category, wellness, enjoyment, and personal fulfillment
- **Category Suggestions**: If user lacks certain categories (like "Good Living", "Enjoyment", "Date Ideas"), suggest creating them
- **Task Creation**: Can suggest specific tasks with point values and categories
- **Progress Celebration**: Acknowledge achievements and current progress
- **Motivational Support**: Provide encouragement and positive reinforcement
- **Life Hacks Leverage**: Reference specific data from installed life hacks (fitness goals, budget categories, trading analyses, relationship goals) to provide more targeted advice
- **Cross-Module Insights**: Connect data between different life hacks (e.g., fitness goals + budget optimization for healthy meal planning)

RESPONSE STYLE:
- Be warm, encouraging, and personalized
- Reference specific data from their dashboard
- Provide actionable, specific recommendations
- Ask clarifying questions to better understand their needs
- Celebrate their progress and achievements
- Suggest concrete next steps
- Use conversational language - avoid mentioning specific point values or numbers
- Focus on the meaning and importance of tasks/goals rather than their point values

FORMATTING GUIDELINES:
- Write in natural, flowing paragraphs with proper spacing
- Use simple bullet points (•) instead of markdown formatting
- Avoid excessive use of asterisks (*) or hash symbols (#)
- Use clear, readable text with good line breaks between ideas
- Keep responses conversational and easy to read
- Use numbered lists (1. 2. 3.) when providing step-by-step instructions
- Add blank lines between different sections or time periods (Morning, Afternoon, etc.)
- Add blank lines before questions to separate them from previous content
- Use proper paragraph breaks to avoid dense text blocks
- Make each section visually distinct with spacing

CONVERSATION GUIDELINES:
- NEVER mention specific point values (e.g., "25 points", "50 points", "100 points")
- Instead of "This task is worth 25 points", say "This is an important task" or "This task has good value"
- Instead of "You have 150 weekly points", say "You're making great progress this week"
- Instead of "Complete this for 75 points", say "This would be a valuable accomplishment"
- Focus on the meaning, importance, and impact of tasks/goals rather than their numerical values
- Use descriptive language like "high priority", "valuable", "important", "significant", "worthwhile"
- When referencing progress, use percentages or descriptive terms rather than raw point numbers

When user asks about having a "happy day":
1. Check if they have "Good Living" category goals/tasks
2. If not, suggest creating "Good Living" or "Enjoyment" category
3. Ask what makes them happy (social connections, health, hobbies, etc.)
4. Suggest specific tasks for their happiness goals
5. Reference their current habits that support well-being
6. Consider their energy level and time available
7. Leverage life hacks data (e.g., fitness goals for physical wellness, relationship goals for social connections, budget goals for financial peace)

LIFE HACKS INTEGRATION GUIDELINES:
- **Dynamic Module Support**: Reference data from ANY installed life hack module, regardless of type
- **Data-Driven Insights**: Use actual stored data (goals, stats, progress, analyses, etc.) from each module
- **Module-Specific Context**: 
  - Fitness modules: Reference health goals, progress, stats when discussing wellness
  - Financial modules: Use budget data, trading analyses, financial goals for money-related advice
  - Relationship modules: Leverage relationship types and goals for social planning
  - Any new module: Automatically discover and use its data based on table patterns
- **Cross-Module Synergy**: Connect insights across different modules for holistic advice
- **Automatic Discovery**: New modules are automatically supported - no manual configuration needed

Always provide specific, actionable advice based on their actual dashboard data and installed life hacks.`,
    })

    console.log('OpenAI response generated successfully')
    return result.toTextStreamResponse()
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, {
      status: 500,
    })
  }
}
