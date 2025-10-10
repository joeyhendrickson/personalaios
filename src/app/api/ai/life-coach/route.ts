import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { env } from '@/lib/env'

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY.trim() === '') {
      return NextResponse.json(
        {
          error: 'OpenAI API key not configured',
          details: 'Please add OPENAI_API_KEY to your environment variables',
        },
        { status: 500 }
      )
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { message, conversation_history = [] } = body

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    console.log(`Life Coach API called for user: ${user.id}`)
    console.log(`User message: ${message}`)

    // Fetch comprehensive user data
    const userData = await fetchComprehensiveUserData(supabase, user.id)
    console.log('Comprehensive user data fetched:', {
      goals: userData.goals.length,
      projects: userData.projects.length,
      tasks: userData.tasks.length,
      habits: userData.habits.length,
      education: userData.education.length,
      priorities: userData.priorities.length,
      points: userData.points,
      weeks: userData.weeks.length,
    })

    // Analyze user personality and patterns
    const personalityAnalysis = await analyzeUserPersonality(userData)
    console.log('Personality analysis completed:', personalityAnalysis.summary)

    // Generate personalized response
    const response = await generateLifeCoachResponse(
      message,
      userData,
      personalityAnalysis,
      conversation_history
    )

    // Store the conversation in activity logs
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'life_coach_chat',
      description: `Life Coach: ${message.substring(0, 100)}...`,
      metadata: {
        message_length: message.length,
        personality_traits: personalityAnalysis.personality_traits,
        data_points_analyzed: Object.keys(userData).length,
      },
    })

    return NextResponse.json({
      success: true,
      response: response.message,
      personality_insights: response.personality_insights,
      module_recommendations: response.module_recommendations,
      actionable_advice: response.actionable_advice,
      conversation_context: response.conversation_context,
    })
  } catch (error) {
    console.error('Error in life coach API:', error)

    // Check if it's an OpenAI API error
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        {
          error: 'OpenAI API key not configured or invalid',
          details: 'Please check your OpenAI API key in the environment variables',
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to generate life coach response',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

async function fetchComprehensiveUserData(supabase: any, userId: string) {
  // Fetch all user data in parallel
  const [
    goalsResult,
    projectsResult,
    tasksResult,
    habitsResult,
    educationResult,
    prioritiesResult,
    pointsResult,
    weeksResult,
    accomplishmentsResult,
    activeModulesResult,
  ] = await Promise.all([
    supabase.from('goals').select('*').eq('user_id', userId),
    supabase.from('projects').select('*').eq('user_id', userId),
    supabase.from('tasks').select('*').eq('user_id', userId),
    supabase.from('daily_habits').select('*').eq('user_id', userId),
    supabase.from('education_items').select('*').eq('user_id', userId),
    supabase.from('priorities').select('*').eq('user_id', userId),
    supabase
      .from('points_ledger')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('weeks')
      .select('*')
      .eq('user_id', userId)
      .order('week_start', { ascending: false })
      .limit(12),
    supabase
      .from('accomplishments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('installed_modules')
      .select('module_id, last_accessed')
      .eq('user_id', userId)
      .eq('is_active', true),
  ])

  return {
    goals: goalsResult.data || [],
    projects: projectsResult.data || [],
    tasks: tasksResult.data || [],
    habits: habitsResult.data || [],
    education: educationResult.data || [],
    priorities: prioritiesResult.data || [],
    points: pointsResult.data || [],
    weeks: weeksResult.data || [],
    accomplishments: accomplishmentsResult.data || [],
    activeModules: activeModulesResult.data || [],
  }
}

async function analyzeUserPersonality(userData: any) {
  // Analyze patterns in user data to determine personality traits
  const analysis = {
    productivity_level: 'medium',
    goal_orientation: 'balanced',
    learning_style: 'mixed',
    habit_consistency: 'moderate',
    task_completion_rate: 0,
    preferred_categories: [] as string[],
    strengths: [] as string[],
    areas_for_improvement: [] as string[],
    personality_traits: [] as string[],
    summary: '',
  }

  // Analyze goals
  if (userData.goals.length > 0) {
    const goalCategories = userData.goals.map((g: any) => g.category).filter(Boolean) as string[]
    analysis.preferred_categories = [...new Set(goalCategories)]

    if (userData.goals.length > 10) {
      analysis.personality_traits.push('highly_goal_oriented')
      analysis.goal_orientation = 'high'
    } else if (userData.goals.length > 5) {
      analysis.personality_traits.push('goal_oriented')
      analysis.goal_orientation = 'balanced'
    }
  }

  // Analyze tasks
  if (userData.tasks.length > 0) {
    const completedTasks = userData.tasks.filter((t: any) => t.is_completed).length
    analysis.task_completion_rate = completedTasks / userData.tasks.length

    if (analysis.task_completion_rate > 0.8) {
      analysis.personality_traits.push('highly_productive')
      analysis.productivity_level = 'high'
      analysis.strengths.push('Excellent task completion')
    } else if (analysis.task_completion_rate > 0.6) {
      analysis.personality_traits.push('productive')
      analysis.productivity_level = 'medium'
    } else {
      analysis.areas_for_improvement.push('Task completion consistency')
    }
  }

  // Analyze habits
  if (userData.habits.length > 0) {
    if (userData.habits.length > 8) {
      analysis.personality_traits.push('habit_focused')
      analysis.habit_consistency = 'high'
      analysis.strengths.push('Strong habit building')
    } else if (userData.habits.length > 4) {
      analysis.personality_traits.push('habit_aware')
      analysis.habit_consistency = 'moderate'
    }
  }

  // Analyze education
  if (userData.education.length > 0) {
    analysis.personality_traits.push('learning_oriented')
    analysis.strengths.push('Commitment to continuous learning')
  }

  // Analyze points and accomplishments
  if (userData.points.length > 0) {
    const totalPoints = userData.points.reduce((sum: number, p: any) => sum + (p.points || 0), 0)
    if (totalPoints > 1000) {
      analysis.personality_traits.push('highly_engaged')
      analysis.strengths.push('High engagement with the system')
    }
  }

  if (userData.accomplishments.length > 0) {
    analysis.personality_traits.push('achievement_focused')
    analysis.strengths.push('Track record of accomplishments')
  }

  // Generate summary
  analysis.summary = `User shows ${analysis.productivity_level} productivity with ${analysis.goal_orientation} goal orientation. Key traits: ${analysis.personality_traits.join(', ')}. Strengths: ${analysis.strengths.join(', ')}.`

  return analysis
}

async function generateLifeCoachResponse(
  message: string,
  userData: any,
  personalityAnalysis: any,
  conversationHistory: any[]
) {
  // Create comprehensive prompt for AI
  const prompt = `
You are an expert Life Coach integrated into a Personal AI OS system. You have access to comprehensive user data and should provide personalized, positive, and actionable advice.

USER DATA ANALYSIS:
${JSON.stringify(
  {
    goals: userData.goals.length,
    projects: userData.projects.length,
    tasks: userData.tasks.length,
    habits: userData.habits.length,
    education: userData.education.length,
    priorities: userData.priorities.length,
    points: userData.points.length,
    weeks: userData.weeks.length,
    accomplishments: userData.accomplishments.length,
    activeModules: userData.activeModules.length,
  },
  null,
  2
)}

ACTIVE MODULES (Only consider these for analysis and recommendations):
${userData.activeModules.map((m: any) => `- ${m.module_id} (last accessed: ${new Date(m.last_accessed).toLocaleDateString()})`).join('\n')}

PERSONALITY ANALYSIS:
${JSON.stringify(personalityAnalysis, null, 2)}

RECENT GOALS:
${userData.goals
  .slice(0, 5)
  .map((g: any) => `- ${g.title} (${g.category})`)
  .join('\n')}

RECENT PROJECTS:
${userData.projects
  .slice(0, 5)
  .map((p: any) => `- ${p.title} (${p.status})`)
  .join('\n')}

RECENT TASKS:
${userData.tasks
  .slice(0, 10)
  .map((t: any) => `- ${t.title} (${t.is_completed ? 'Completed' : 'Pending'})`)
  .join('\n')}

CURRENT HABITS:
${userData.habits
  .slice(0, 5)
  .map((h: any) => `- ${h.name} (${h.frequency})`)
  .join('\n')}

EDUCATION ITEMS:
${userData.education
  .slice(0, 5)
  .map((e: any) => `- ${e.title} (${e.status})`)
  .join('\n')}

CURRENT PRIORITIES:
${userData.priorities
  .slice(0, 5)
  .map((p: any) => `- ${p.title} (${p.priority_type})`)
  .join('\n')}

RECENT ACCOMPLISHMENTS:
${userData.accomplishments
  .slice(0, 3)
  .map((a: any) => `- ${a.title}`)
  .join('\n')}

CONVERSATION HISTORY:
${conversationHistory
  .slice(-5)
  .map((h: any) => `${h.role}: ${h.content}`)
  .join('\n')}

USER'S CURRENT MESSAGE:
"${message}"

INSTRUCTIONS:
1. Provide a warm, encouraging, and personalized response
2. Acknowledge their progress and strengths based on their data
3. Offer specific, actionable advice tailored to their personality and goals
4. Suggest relevant modules that could help them achieve their objectives
5. Be positive about their use of the Personal AI OS system
6. Reference their specific goals, projects, or habits when relevant
7. Keep the tone conversational and supportive

AVAILABLE MODULES TO RECOMMEND (Only recommend modules that are NOT already active):
- Day Trader: For financial growth and investment learning
- Budget Optimizer: For financial management and spending optimization
- Life Coach: For personalized coaching and motivation
- Fitness Tracker: For health and wellness goals
- Time Blocker: For productivity and time management
- Relationship Manager: For personal and professional relationship tracking
- Mood Tracker: For mental health and emotional well-being
- Energy Optimizer: For energy management and performance
- Calendar AI: For smart scheduling and time optimization
- Analytics Dashboard: For comprehensive data visualization and insights
- Focus Enhancer: For advanced focus tracking and concentration optimization
- Stress Manager: For stress level tracking and management techniques
- Creativity Boost: For AI-powered brainstorming and idea generation

IMPORTANT: Only recommend modules that the user has NOT already installed. Check the ACTIVE MODULES list above before making recommendations.

Format your response as JSON with this structure:
{
  "message": "Your warm, personalized response to the user",
  "personality_insights": {
    "traits_observed": ["list of personality traits you notice"],
    "strengths_highlighted": ["specific strengths to acknowledge"],
    "growth_areas": ["areas where they could improve"]
  },
  "module_recommendations": [
    {
      "module": "Module name",
      "reason": "Why this module would help them",
      "connection": "How it relates to their current goals/habits"
    }
  ],
  "actionable_advice": [
    {
      "action": "Specific action they can take",
      "timeline": "When to do it",
      "benefit": "Expected benefit"
    }
  ],
  "conversation_context": {
    "mood": "positive/encouraging/supportive",
    "focus_area": "primary area to focus on",
    "next_steps": "suggested next steps"
  }
}

Remember: Be genuinely helpful, acknowledge their efforts, and provide specific guidance based on their actual data and patterns.
`

  // Use AI to generate response
  const { text: aiResponse } = await generateText({
    model: openai('gpt-4.1-mini'),
    messages: [
      {
        role: 'system',
        content:
          "You are an expert Life Coach with access to comprehensive user data. Provide personalized, positive, and actionable advice based on the user's goals, habits, and progress. Always be encouraging and specific in your recommendations.",
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
  })

  let parsedResponse
  try {
    parsedResponse = JSON.parse(aiResponse)
  } catch {
    // If JSON parsing fails, return a structured response
    parsedResponse = {
      message: aiResponse,
      personality_insights: {
        traits_observed: personalityAnalysis.personality_traits,
        strengths_highlighted: personalityAnalysis.strengths,
        growth_areas: personalityAnalysis.areas_for_improvement,
      },
      module_recommendations: [
        {
          module: 'Goal Achiever',
          reason: 'Based on your goal-oriented nature',
          connection: 'Would help you achieve your current objectives more effectively',
        },
      ],
      actionable_advice: [
        {
          action: 'Review your current goals and prioritize the most important ones',
          timeline: 'This week',
          benefit: 'Better focus and progress tracking',
        },
      ],
      conversation_context: {
        mood: 'positive',
        focus_area: 'goal achievement',
        next_steps: 'Continue building on your current momentum',
      },
    }
  }

  return parsedResponse
}
