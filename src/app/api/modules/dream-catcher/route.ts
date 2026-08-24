import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { env } from '@/lib/env'
import { resolveOpenAIModelId } from '@/lib/ai/openai-model-id'
import {
  getIntakeCap,
  getIntakeQuestionContext,
  getStreamlinedPhaseInstructions,
  isVisionAcceptance,
  normalizeDreamCatcherPath,
  normalizeDreamCatcherPhase,
  type DreamCatcherPath,
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
    const intakePath =
      normalizeDreamCatcherPath(body.intake_path) ??
      normalizeDreamCatcherPath(assessment_data.intake_path) ??
      'discovery'

    const response = await generateDreamCatcherResponse(
      message,
      current_phase,
      assessment_data,
      userData,
      conversation_history,
      body.personality_question_index ?? body.intake_question_index ?? 0,
      Boolean(body.vision_accepted) || isVisionAcceptance(message),
      intakePath
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
  intakeQuestionIndex: number = 0,
  visionAccepted: boolean = false,
  path: DreamCatcherPath = 'discovery'
) {
  const intakeCap = getIntakeCap(path)
  const normalizedPhase = normalizeDreamCatcherPhase(currentPhase)
  const clampedIndex = Math.min(Math.max(intakeQuestionIndex, 0), intakeCap)

  // Hard stop: after all intake questions, move to vision without another AI call on stale index
  if (normalizedPhase === 'intake' && clampedIndex >= intakeCap) {
    return {
      message:
        "Thank you for sharing so much with me. I've gathered what I need from our conversation — let's shape your vision next. What would you say is the single sentence that captures who you're becoming?",
      next_phase: 'vision',
      intake_question_index: intakeCap,
      assessment_data: clampAssessmentData({ ...assessmentData, intake_path: path }),
    }
  }

  const phaseInstruction = getStreamlinedPhaseInstructions(normalizedPhase, clampedIndex, path)
  const intakeContext = getIntakeQuestionContext(clampedIndex, normalizedPhase, path)

  const hasExistingDashboard =
    userData.goals.length > 0 || userData.projects.length > 0 || userData.habits.length > 0

  const contextSummary = buildContextSummary(assessmentData, userData, conversationHistory)

  const promptSummary = summarizeAssessmentForPrompt(assessmentData)

  const prompt = `
You are Dream Catcher, a warm LifeStacks onboarding coach. Help users discover what matters and prepare a starter dashboard.
PATH: ${path === 'fast' ? 'fast catch — keep it brief; half the beats are still a short scene' : 'discovery journey — about 50% journalistic story beats; infer the Life Plan from what happened, not from labels'}.

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
1. Be warm, concise, and encouraging — keep the conversational message under ~3 short sentences (bullets ok when listing goals/projects/tasks)
2. Ask ONE question at a time in intake phase only
3. In assessment_data, include ONLY NEW extracted items per array field (server merges and deduplicates)
4. Use next_phase values only from: intake, vision, goals, projects, tasks, summary, confirm
5. Cascade in order: finalize goals (${DREAM_CATCHER_LIMITS.goals.min}-${DREAM_CATCHER_LIMITS.goals.max}) → then projects (${DREAM_CATCHER_LIMITS.projects.min}-${DREAM_CATCHER_LIMITS.projects.max}) → then tasks (${DREAM_CATCHER_LIMITS.tasks.min}-${DREAM_CATCHER_LIMITS.tasks.max})
6. In goals phase: ONLY goals_generated — then next_phase "projects"
7. In projects phase: ONLY project_ideas (milestones/strategies, NOT goal copies) — then next_phase "tasks"
8. In tasks phase: ONLY task_ideas (concrete tactics linked to projects) — then next_phase "summary"
9. In summary phase, write life_plan_summary — then move to confirm
10. In confirm phase, do not ask questions — point user to the Life Plan preview panel
11. Never mention remaining questions, totals, or how long this will take
12. Treat tap-chip replies and "Skip this one" as complete answers; skip covered themes and end intake early when you have enough for a Life Plan
13. On STORY BEATS: ask for scenes (who/where/what happened). Infer goals, blockers, people, and habits from the story — do not ask them to name their conclusions
14. In vision phase, stay on vision until the user keeps/accepts the painted vision; do not push anything to the dashboard
15. Return ONLY valid JSON — no markdown fences

RESPONSE FORMAT (JSON only):
{
  "message": "Your conversational response",
  "next_phase": "intake|vision|goals|projects|tasks|summary|confirm",
  "intake_question_index": ${normalizedPhase === 'intake' ? clampedIndex + 1 : clampedIndex},
  "assessment_data": {
    "personality_traits": [],
    "personal_insights": [],
    "measurement_preferences": [],
    "dreams_discovered": [],
    "vision_statement": "",
    "life_plan_summary": "",
    "goals_generated": [
      { "goal": "...", "description": "unique why + how success is measured", "category": "...", "priority": "high|medium|low", "timeline": "...", "target_value": 0, "target_unit": "..." }
    ],
    "project_ideas": [{ "title": "milestone or strategy (NOT the goal title)", "description": "unique details from intake", "category": "...", "linked_goal": "exact goal title this supports" }],
    "habit_ideas": [{ "title": "...", "description": "..." }],
    "task_ideas": [{ "title": "concrete action (NOT goal/project copy)", "description": "unique step details from intake", "category": "...", "linked_project": "exact project title", "step_order": 1 }],
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
            'You are Dream Catcher, a warm coach who catches what matters in a quick, one-question-at-a-time chat. Keep replies under three short sentences. Never mention remaining questions or how long the session will take. Always respond with valid JSON only — no markdown code fences.',
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
  if (normalizedPhase === 'intake' && Number(parsedResponse.intake_question_index) >= intakeCap) {
    parsedResponse.next_phase = 'vision'
    parsedResponse.intake_question_index = intakeCap
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
  ;(parsedResponse.assessment_data as Record<string, unknown>).intake_path = path

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

  // Projects phase: replace project_ideas when AI sends a full finalized set
  if (
    normalizedPhase === 'projects' &&
    Array.isArray(parsedResponse.assessment_data?.project_ideas)
  ) {
    const incoming = (parsedResponse.assessment_data as Record<string, unknown>)
      .project_ideas as unknown[]
    if (incoming.length >= DREAM_CATCHER_LIMITS.projects.min) {
      ;(parsedResponse.assessment_data as Record<string, unknown>).project_ideas = incoming.slice(
        0,
        DREAM_CATCHER_LIMITS.projects.max
      )
    }
  }

  // Tasks phase: replace task_ideas when AI sends a full finalized set
  if (normalizedPhase === 'tasks' && Array.isArray(parsedResponse.assessment_data?.task_ideas)) {
    const incoming = (parsedResponse.assessment_data as Record<string, unknown>)
      .task_ideas as unknown[]
    if (incoming.length >= DREAM_CATCHER_LIMITS.tasks.min) {
      ;(parsedResponse.assessment_data as Record<string, unknown>).task_ideas = incoming.slice(
        0,
        DREAM_CATCHER_LIMITS.tasks.max
      )
    }
  }

  // Enforce cascade: don't skip projects/tasks phases
  const merged = parsedResponse.assessment_data as Record<string, unknown>
  const goalCount = Array.isArray(merged?.goals_generated) ? merged.goals_generated.length : 0
  const projectCount = Array.isArray(merged?.project_ideas) ? merged.project_ideas.length : 0
  const taskCount = Array.isArray(merged?.task_ideas) ? merged.task_ideas.length : 0

  if (
    normalizedPhase === 'goals' &&
    parsedResponse.next_phase === 'summary' &&
    goalCount >= DREAM_CATCHER_LIMITS.goals.min
  ) {
    parsedResponse.next_phase = 'projects'
  }
  if (
    normalizedPhase === 'projects' &&
    parsedResponse.next_phase === 'summary' &&
    projectCount >= DREAM_CATCHER_LIMITS.projects.min
  ) {
    parsedResponse.next_phase = 'tasks'
  }
  if (normalizedPhase === 'tasks' && parsedResponse.next_phase === 'confirm') {
    parsedResponse.next_phase = 'summary'
  }
  if (
    (normalizedPhase === 'goals' || normalizedPhase === 'projects') &&
    parsedResponse.next_phase === 'confirm'
  ) {
    parsedResponse.next_phase =
      goalCount >= DREAM_CATCHER_LIMITS.goals.min &&
      projectCount < DREAM_CATCHER_LIMITS.projects.min
        ? 'projects'
        : taskCount < DREAM_CATCHER_LIMITS.tasks.min
          ? 'tasks'
          : 'summary'
  }

  // Hold on the painted vision until the user keeps it — never skip to dashboard items.
  const visionText =
    typeof merged?.vision_statement === 'string' ? merged.vision_statement.trim() : ''
  const acceptedVision = visionAccepted || isVisionAcceptance(message)
  if (normalizedPhase === 'vision' && visionText.length > 0 && !acceptedVision) {
    parsedResponse.next_phase = 'vision'
  }
  if (normalizedPhase === 'vision' && visionText.length > 0 && acceptedVision) {
    parsedResponse.next_phase = 'goals'
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
