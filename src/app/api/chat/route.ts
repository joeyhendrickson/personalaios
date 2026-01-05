import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { messages, language = 'en' } = await req.json()
    console.log('Chat API called with messages:', messages.length, 'language:', language)

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

    // Fetch user's dashboard data and profile assessment data
    const [
      goalsResult,
      tasksResult,
      habitsResult,
      educationResult,
      prioritiesResult,
      pointsResult,
      installedModulesResult,
      completedTasksTodayResult,
      relationshipsResult,
      habitCompletionsResult,
      profileResult,
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

      // Completed tasks today
      supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('updated_at', new Date().setHours(0, 0, 0, 0)),

      // Relationships for social suggestions
      supabase
        .from('relationships')
        .select('*')
        .eq('user_id', user.id)
        .order('last_interaction', { ascending: false }),

      // Today's habit completions
      supabase
        .from('daily_habit_completions')
        .select('*, daily_habits(title)')
        .eq('user_id', user.id)
        .gte('completed_at', new Date().setHours(0, 0, 0, 0)),

      // User profile with assessment data (try profiles table first, then user_profiles)
      supabase.from('profiles').select('assessment_data').eq('id', user.id).single(),
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
          'relationship-manager': ['relationships', 'relationship_types', 'relationship_goals'],
          'grocery-optimizer': ['grocery_receipts', 'grocery_items', 'grocery_analyses'],
          'ai-coach': ['ai_coach_sessions', 'ai_coach_insights'],
          'time-blocker': ['time_blocks', 'time_block_sessions'],
          'post-creator': [
            'post_creator_jobs',
            'post_creator_posts',
            'post_creator_voice_profiles',
          ],
          'project-plan-builder': ['project_plan_builder_jobs', 'project_plan_builder_projects'],
          'raid-monitoring': ['raid_monitoring_jobs', 'raid_monitoring_entries'],
          'focus-enhancer': ['focus_sessions', 'focus_benchmarks', 'focus_analyses'],
          'habit-master': ['habit_master_templates', 'habit_master_insights'],
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
    const completedTasksToday = completedTasksTodayResult.data || []
    const relationships = relationshipsResult.data || []
    const habitCompletionsToday = habitCompletionsResult.data || []
    // const installedModules = installedModulesResult.data || []

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

    // Identify fire priorities
    const firePriorities = priorities.filter(
      (p) => p.title?.includes('🔥') || p.priority_level === 'fire' || p.priority_score >= 90
    )

    // Extract assessment data from profile (try user_profiles if profiles doesn't have it)
    let assessmentData = profileResult?.data?.assessment_data || {}
    if (!assessmentData || Object.keys(assessmentData).length === 0) {
      const { data: userProfileData } = await supabase
        .from('user_profiles')
        .select('assessment_data')
        .eq('user_id', user.id)
        .single()
      assessmentData = userProfileData?.assessment_data || {}
    }

    const userContext = {
      weeklyPoints,
      dailyPoints,
      totalGoals: goals.length,
      totalTasks: tasks.length,
      totalHabits: habits.length,
      totalEducationItems: educationItems.length,
      activePriorities: priorities.length,
      completedTasksToday: completedTasksToday.length,
      categories: allCategories,
      hasGoodLiving,
      goals: goals.slice(0, 5), // Top 5 goals for context
      recentTasks: tasks.slice(0, 10), // Recent 10 tasks
      habits: habits.slice(0, 5), // Top 5 habits
      priorities: priorities.slice(0, 5), // Top 5 priorities
      firePriorities: firePriorities.slice(0, 3), // Top 3 fire priorities
      completedToday: completedTasksToday.slice(0, 10), // Today's completions
      relationships: relationships.slice(0, 5), // Top 5 relationships
      habitCompletionsToday: habitCompletionsToday.length,
      installedModules: installedModulesList.map((m) => m.module_id),
      moduleData: moduleDataResults,
    }

    console.log('Calling OpenAI with user context...')

    // Language-specific instruction

    const result = await streamText({
      model: openai('gpt-4.1-mini'),
      messages,
      system: `You are an intelligent AI assistant for a Personal AI OS dashboard. You have access to the user's complete dashboard data and can provide personalized advice based on their goals, tasks, habits, education items, and priorities.

${
  assessmentData && Object.keys(assessmentData).length > 0
    ? `USER'S PERSONAL PROFILE (from Dream Catcher Assessment):
${assessmentData.personality_traits?.length > 0 ? `- Personality Traits: ${assessmentData.personality_traits.join(', ')}` : ''}
${assessmentData.personal_insights?.length > 0 ? `- Personal Insights: ${assessmentData.personal_insights.join('; ')}` : ''}
${assessmentData.dreams_discovered?.length > 0 ? `- Dreams Discovered: ${assessmentData.dreams_discovered.join(', ')}` : ''}
${assessmentData.vision_statement ? `- Vision Statement: ${assessmentData.vision_statement}` : ''}
${assessmentData.executive_skills ? `- Executive Skills: ${JSON.stringify(assessmentData.executive_skills, null, 2)}` : ''}
${assessmentData.executive_blocking_factors?.length > 0 ? `- Blocking Factors: ${assessmentData.executive_blocking_factors.map((f: any) => f.factor).join(', ')}` : ''}
Use this profile information to provide more personalized and contextually relevant advice. Reference the user's personality traits, dreams, and vision when appropriate.

`
    : ''
}USER'S CURRENT DASHBOARD DATA:
- Weekly Points: ${userContext.weeklyPoints}
- Daily Points: ${userContext.dailyPoints}
- Total Goals: ${userContext.totalGoals}
- Total Tasks: ${userContext.totalTasks}
- Total Habits: ${userContext.totalHabits}
- Total Education Items: ${userContext.totalEducationItems}
- Active Priorities: ${userContext.activePriorities}
- Completed Tasks Today: ${userContext.completedTasksToday}
- Habit Completions Today: ${userContext.habitCompletionsToday}
- Categories: ${userContext.categories.join(', ')}
- Has Good Living Category: ${userContext.hasGoodLiving}
- Installed Life Hacks: ${userContext.installedModules.join(', ') || 'None'}

RECENT GOALS:
${userContext.goals.map((g) => `- ${g.title} (${g.category}) - Progress: ${g.current_points}/${g.target_points}`).join('\n')}

RECENT TASKS:
${userContext.recentTasks.map((t) => `- ${t.title} (${t.category}) - Status: ${t.status}`).join('\n')}

COMPLETED TODAY:
${userContext.completedToday.length > 0 ? userContext.completedToday.map((t: any) => `- ${t.title} (${t.category})`).join('\n') : '- No tasks completed yet today'}

ACTIVE HABITS:
${userContext.habits.map((h) => `- ${h.title}`).join('\n')}

TOP PRIORITIES:
${userContext.priorities.map((p) => `- ${p.title} - Priority Level: ${p.priority_score > 80 ? 'High' : p.priority_score > 60 ? 'Medium' : 'Low'}`).join('\n')}

🔥 FIRE PRIORITIES (Emergency Items):
${userContext.firePriorities.length > 0 ? userContext.firePriorities.map((p: any) => `- ${p.title}`).join('\n') : '- No fire priorities'}

RELATIONSHIPS (for social suggestions):
${userContext.relationships.length > 0 ? userContext.relationships.map((r: any) => `- ${r.name || r.contact_name || 'Unknown'} (Last interaction: ${r.last_interaction ? new Date(r.last_interaction).toLocaleDateString() : 'Never'})`).join('\n') : '- No relationships tracked yet'}

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

SPECIAL BUTTON PROMPTS:

**Wake Up Button** (Morning Planning):
1. Show a clear, organized view of the day's priorities, tasks, and goals
2. Ask if there's a specific area they want to focus on today
3. Based on their focus area response, suggest updating/reordering their priorities
4. After providing the updated plan, ask: "Would you like me to reset your priorities list on the dashboard with this day's plan?"
5. Provide morning motivation and set the tone for a productive day

**Happy Day Button** (Balanced Day Planning):
1. 🔥 Show fire/emergency items from their priorities that need immediate attention
2. 👥 Suggest social activities - reference friends from relationship_manager data if available
3. 🎉 Recommend nearby events based on their interests (use location data from grocery_optimizer if available)
4. 😌 Suggest relaxing activities from their daily_habits list
5. ✨ Recommend fun activities based on their interests (psychographic analysis of goals, tasks, projects)
6. Balance urgency with enjoyment for a fulfilling day

**Check-In Button** (Progress Review):
1. ✅ List items they've completed today (check task statuses)
2. 📊 Show progress report on points and priorities completion
3. ⏳ Call out pending priorities that haven't been touched
4. 🎯 If stuck (low points, no activity), provide strategic approach to make progress
5. Celebrate wins and provide encouragement for remaining work

**Wellness Update Button** (Health & Energy):
1. Ask what they're experiencing (low energy, health issues, mental fog, need rest)
2. Provide personalized suggestions based on their response
3. Reference fitness goals/data if available from fitness_tracker module
4. Suggest rest/recovery strategies
5. Show how to rest while staying on track
6. Provide energy-boosting suggestions (habits, nutrition, movement)
7. Adjust day's plan to accommodate wellness needs

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

Always provide specific, actionable advice based on their actual dashboard data and installed life hacks.

LANGUAGE INSTRUCTION:
${language === 'es' ? 'Respond in Spanish (español) for all your messages. Use natural, conversational Spanish and maintain a helpful, encouraging tone.' : 'Respond in English for all your messages.'}`,
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
