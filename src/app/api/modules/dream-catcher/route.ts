import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { env } from '@/lib/env'
import { resolveOpenAIModelId } from '@/lib/ai/openai-model-id'
import {
  getIntakeQuestionContext,
  getStreamlinedPhaseInstructions,
  INTAKE_QUESTION_COUNT,
  normalizeDreamCatcherPhase,
} from '@/lib/dream-catcher/streamlined-phases'
import {
  clampAssessmentData,
  mergeAssessmentData,
  summarizeAssessmentForPrompt,
} from '@/lib/dream-catcher/assessment-merge'
import { DREAM_CATCHER_LIMITS, formatPlanLimitsForPrompt } from '@/lib/dream-catcher/plan-limits'

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
    const {
      message,
      conversation_history = [],
      current_phase = 'personality',
      assessment_data = {},
    } = body

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    console.log(`Dream Catcher API called for user: ${user.id}`)
    console.log(`Current phase: ${current_phase}`)

    // Fetch user data for context
    const userData = await fetchUserData(supabase, user.id)

    // Generate response based on current phase
    const response = await generateDreamCatcherResponse(
      message,
      current_phase,
      assessment_data,
      userData,
      conversation_history,
      body.personality_question_index ?? body.intake_question_index ?? 0
    )

    // Store the conversation in activity logs
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'dream_catcher_session',
      description: `Dream Catcher: ${normalizeDreamCatcherPhase(current_phase)} phase - ${message.substring(0, 100)}...`,
      metadata: {
        phase: current_phase,
        message_length: message.length,
      },
    })

    return NextResponse.json({
      success: true,
      response: response.message,
      next_phase: response.next_phase,
      assessment_data: response.assessment_data,
      personality_question_index: response.intake_question_index,
      intake_question_index: response.intake_question_index,
    })
  } catch (error) {
    console.error('Error in Dream Catcher API:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      hasOpenAIKey: !!env.OPENAI_API_KEY,
      openAIModel: resolveOpenAIModelId(),
    })

    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        {
          error: 'OpenAI API key not configured or invalid',
          details: 'Please check your OpenAI API key in the environment variables',
        },
        { status: 500 }
      )
    }

    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    if (errorMessage.includes('model_not_found') || errorMessage.includes('does not have access')) {
      return NextResponse.json(
        {
          error: 'Dream Catcher AI model is unavailable',
          details: `Set OPENAI_MODEL in your environment to a model your API key can use (e.g. gpt-4o-mini). Current model: ${resolveOpenAIModelId()}`,
        },
        { status: 500 }
      )
    }

    const errorDetails =
      error instanceof Error && error.stack
        ? error.stack.split('\n').slice(0, 3).join('\n')
        : undefined

    return NextResponse.json(
      {
        error: 'Failed to generate Dream Catcher response',
        details: errorMessage,
        ...(errorDetails && { stack: errorDetails }),
      },
      { status: 500 }
    )
  }
}

async function fetchUserData(supabase: any, userId: string) {
  // Fetch relevant user data for context
  const [goalsResult, projectsResult, habitsResult, prioritiesResult] = await Promise.all([
    supabase.from('goals').select('*').eq('user_id', userId).limit(10),
    supabase.from('projects').select('*').eq('user_id', userId).limit(10),
    supabase.from('daily_habits').select('*').eq('user_id', userId).limit(10),
    supabase.from('priorities').select('*').eq('user_id', userId).limit(10),
  ])

  return {
    goals: goalsResult.data || [],
    projects: projectsResult.data || [],
    habits: habitsResult.data || [],
    priorities: prioritiesResult.data || [],
  }
}

async function generateDreamCatcherResponse(
  message: string,
  currentPhase: string,
  assessmentData: any,
  userData: any,
  conversationHistory: any[],
  intakeQuestionIndex: number = 0
) {
  const normalizedPhase = normalizeDreamCatcherPhase(currentPhase)
  const clampedIndex = Math.min(Math.max(intakeQuestionIndex, 0), INTAKE_QUESTION_COUNT)

  // Hard stop: after all intake questions, move to vision without another AI call on stale index
  if (normalizedPhase === 'intake' && clampedIndex >= INTAKE_QUESTION_COUNT) {
    return {
      message:
        "Thank you for sharing so much with me. I've gathered what I need from our conversation — let's shape your vision next. What would you say is the single sentence that captures who you're becoming?",
      next_phase: 'vision',
      intake_question_index: INTAKE_QUESTION_COUNT,
      assessment_data: clampAssessmentData(assessmentData),
    }
  }

  const phaseInstruction = getStreamlinedPhaseInstructions(normalizedPhase, clampedIndex)
  const intakeContext = getIntakeQuestionContext(clampedIndex, normalizedPhase)

  const hasExistingDashboard =
    userData.goals.length > 0 || userData.projects.length > 0 || userData.habits.length > 0

  const contextSummary = buildContextSummary(assessmentData, userData, conversationHistory)

  const promptSummary = summarizeAssessmentForPrompt(assessmentData)

  const prompt = `
You are Dream Catcher, a warm LifeStacks onboarding coach. Help users discover what matters and prepare a starter dashboard — quickly, without overwhelming them.

${phaseInstruction}
${intakeContext}

CURRENT ASSESSMENT DATA (summarized — only add NEW items in your response arrays):
${JSON.stringify(promptSummary, null, 2)}

USER'S EXISTING DASHBOARD (for context only — never replace these; new items will be added):
- Goals: ${userData.goals.length}
- Projects: ${userData.projects.length}
- Habits: ${userData.habits.length}
${hasExistingDashboard ? '- User already has dashboard items. Emphasize that confirming will ADD new goals/projects/tasks/habits without removing existing ones.' : '- User has an empty dashboard. Confirming will create their starter setup.'}

STARTER DASHBOARD LIMITS (enforce when consolidating in goals phase):
${formatPlanLimitsForPrompt()}

RECENT CONVERSATION:
${conversationHistory
  .slice(-8)
  .map((h: any) => `${h.role}: ${h.content}`)
  .join('\n')}

CONTEXT SUMMARY:
${contextSummary}

USER'S CURRENT MESSAGE:
"${message}"

INSTRUCTIONS:
1. Be warm, concise, and encouraging — no long lectures
2. Ask ONE question at a time in intake phase only
3. In assessment_data, include ONLY NEW extracted items per array field (server merges and deduplicates)
4. Use next_phase values only from: intake, vision, goals, summary, confirm
5. In goals phase, produce exactly ${DREAM_CATCHER_LIMITS.goals.min}-${DREAM_CATCHER_LIMITS.goals.max} goals in goals_generated with target_value + target_unit
6. In summary phase, write life_plan_summary — then move to confirm
7. In confirm phase, do not ask questions — point user to the Life Plan preview panel
8. Return ONLY valid JSON — no markdown fences

RESPONSE FORMAT (JSON only):
{
  "message": "Your conversational response",
  "next_phase": "intake|vision|goals|summary|confirm",
  "intake_question_index": ${normalizedPhase === 'intake' ? clampedIndex + 1 : clampedIndex},
  "assessment_data": {
    "personality_traits": [],
    "personal_insights": [],
    "measurement_preferences": [],
    "dreams_discovered": [],
    "vision_statement": "",
    "life_plan_summary": "",
    "goals_generated": [
      { "goal": "...", "category": "...", "priority": "high|medium|low", "timeline": "...", "target_value": 0, "target_unit": "..." }
    ],
    "project_ideas": [{ "title": "...", "description": "...", "category": "...", "linked_goal": "..." }],
    "habit_ideas": [{ "title": "...", "description": "..." }],
    "task_ideas": [{ "title": "...", "description": "...", "category": "..." }],
    "education_items": [{ "title": "...", "description": "...", "target_date": "YYYY-MM-DD", "priority_level": 3 }],
    "fitness_profile": { "goals": [], "baseline": {} },
    "ruminations": [{ "description": "...", "severity": "low|medium|high", "fear_type": "...", "coping_strategies": [] }],
    "gratitude_starters": { "items": [], "practice_idea": "...", "reflection": "..." },
    "key_relationships": [{ "name": "...", "relationship_type": "friend|family|...", "notes": "...", "contact_frequency_days": 14, "priority_level": 3 }]
  }
}
`

  // Use AI to generate response (with fallback model if primary is unavailable)
  let aiResponse: string
  const primaryModel = resolveOpenAIModelId()
  const fallbackModel = 'gpt-4o-mini'

  async function callModel(modelId: string) {
    const result = await generateText({
      model: openai(modelId),
      messages: [
        {
          role: 'system',
          content:
            'You are Dream Catcher, an expert personal consultant helping people discover their authentic dreams and create actionable plans. You are warm, empathetic, curious, and skilled at asking powerful questions. Always respond with valid JSON only — no markdown code fences.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
    })
    return result.text
  }

  try {
    aiResponse = await callModel(primaryModel)
  } catch (generateError) {
    const errMsg = generateError instanceof Error ? generateError.message : String(generateError)
    const shouldFallback =
      primaryModel !== fallbackModel &&
      (errMsg.includes('model_not_found') ||
        errMsg.includes('does not have access') ||
        errMsg.includes('does not exist'))

    if (shouldFallback) {
      console.warn(`Dream Catcher: falling back from ${primaryModel} to ${fallbackModel}`)
      try {
        aiResponse = await callModel(fallbackModel)
      } catch (fallbackError) {
        console.error('Error calling OpenAI fallback model:', fallbackError)
        throw new Error(
          `Failed to generate AI response: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`
        )
      }
    } else {
      console.error('Error calling OpenAI generateText:', {
        error: errMsg,
        hasOpenAIKey: !!env.OPENAI_API_KEY,
        model: primaryModel,
        promptLength: prompt.length,
      })
      throw new Error(`Failed to generate AI response: ${errMsg}`)
    }
  }

  let parsedResponse
  try {
    const trimmed = aiResponse.trim()
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    parsedResponse = JSON.parse(start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed)
  } catch {
    parsedResponse = {
      message: aiResponse.replace(/```json|```/g, '').trim(),
      next_phase: normalizedPhase,
      intake_question_index: clampedIndex + (normalizedPhase === 'intake' ? 1 : 0),
      assessment_data: {},
    }
  }

  if (parsedResponse.next_phase) {
    parsedResponse.next_phase = normalizeDreamCatcherPhase(parsedResponse.next_phase)
  }

  if (parsedResponse.intake_question_index === undefined) {
    parsedResponse.intake_question_index =
      parsedResponse.personality_question_index ??
      clampedIndex + (normalizedPhase === 'intake' ? 1 : 0)
  }

  // Enforce intake cap server-side
  if (
    normalizedPhase === 'intake' &&
    Number(parsedResponse.intake_question_index) >= INTAKE_QUESTION_COUNT
  ) {
    parsedResponse.next_phase = 'vision'
    parsedResponse.intake_question_index = INTAKE_QUESTION_COUNT
  }

  // Merge assessment data with deduplication and caps
  if (parsedResponse.assessment_data) {
    parsedResponse.assessment_data = mergeAssessmentData(
      assessmentData,
      parsedResponse.assessment_data as Record<string, unknown>
    )
  } else {
    parsedResponse.assessment_data = clampAssessmentData(assessmentData)
  }

  // Goals phase: replace goals array when AI sends a full finalized set
  if (
    normalizedPhase === 'goals' &&
    Array.isArray(parsedResponse.assessment_data?.goals_generated)
  ) {
    const incoming = (parsedResponse.assessment_data as Record<string, unknown>)
      .goals_generated as unknown[]
    if (incoming.length >= DREAM_CATCHER_LIMITS.goals.min) {
      ;(parsedResponse.assessment_data as Record<string, unknown>).goals_generated = incoming.slice(
        0,
        DREAM_CATCHER_LIMITS.goals.max
      )
    }
  }

  return parsedResponse
}

function buildContextSummary(assessmentData: any, userData: any, conversationHistory: any[]) {
  const summary = []

  if (assessmentData.personality_traits && assessmentData.personality_traits.length > 0) {
    summary.push(`Personality: ${assessmentData.personality_traits.join(', ')}`)
  }

  if (assessmentData.personal_insights && assessmentData.personal_insights.length > 0) {
    summary.push(`Key Insights: ${assessmentData.personal_insights.slice(0, 3).join(', ')}`)
  }

  if (assessmentData.executive_skills) {
    const strengths = assessmentData.executive_skills.strengths || []
    const areas = assessmentData.executive_skills.areas_for_development || []
    if (strengths.length > 0) {
      summary.push(`Executive Strengths: ${strengths.slice(0, 2).join(', ')}`)
    }
    if (areas.length > 0) {
      summary.push(`Areas to Develop: ${areas.slice(0, 2).join(', ')}`)
    }
  }

  if (
    assessmentData.executive_blocking_factors &&
    assessmentData.executive_blocking_factors.length > 0
  ) {
    summary.push(
      `Blocking Factors: ${assessmentData.executive_blocking_factors
        .slice(0, 2)
        .map((f: any) => f.factor)
        .join(', ')}`
    )
  }

  if (assessmentData.dreams_discovered && assessmentData.dreams_discovered.length > 0) {
    summary.push(`Dreams: ${assessmentData.dreams_discovered.slice(0, 3).join(', ')}`)
  }

  if (assessmentData.vision_statement) {
    summary.push(`Vision: ${assessmentData.vision_statement.substring(0, 100)}...`)
  }

  if (userData.goals.length > 0) {
    summary.push(
      `Existing Goals: ${userData.goals
        .slice(0, 3)
        .map((g: any) => g.title)
        .join(', ')}`
    )
  }

  return summary.length > 0 ? summary.join('\n') : 'Starting fresh journey of discovery.'
}
