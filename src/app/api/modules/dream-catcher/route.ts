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
      body.personality_question_index || 0
    )

    // Store the conversation in activity logs
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'dream_catcher_session',
      description: `Dream Catcher: ${current_phase} phase - ${message.substring(0, 100)}...`,
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
      personality_question_index: response.personality_question_index,
    })
  } catch (error) {
    console.error('Error in Dream Catcher API:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      hasOpenAIKey: !!env.OPENAI_API_KEY,
      openAIModel: env.OPENAI_MODEL || 'gpt-4.1-mini',
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
  personalityQuestionIndex: number = 0
) {
  const phaseInstructions = {
    personality: `
You are in the PERSONALITY ASSESSMENT phase. Your goal is to conduct a structured 20-question personality assessment that will lead to a comprehensive understanding of the user's personality profile.

IMPORTANT: You must ask ONE question at a time from the list below. Track which questions have been asked using the conversation history. Do NOT ask multiple questions at once. After the user answers, acknowledge their response briefly, then ask the next question.

Here are the 20 questions you must ask in order:

1. "On a scale of 1-10, how much do you recharge your energy from being alone versus being with others? (1 = completely alone, 10 = completely with others)"
2. "When making decisions, do you tend to rely more on logic and facts, or on your feelings and values? Can you give me a recent example?"
3. "How do you typically handle stress or overwhelming situations? What's your go-to response?"
4. "Describe your ideal weekend. What activities would you choose and why?"
5. "When you're in a group setting, do you prefer to lead the conversation, participate actively, observe quietly, or something else?"
6. "Think about a time you had to solve a difficult problem. Walk me through your thought process - how did you approach it?"
7. "How do you prefer to receive information? Do you like detailed explanations, quick summaries, visual aids, or hands-on experience?"
8. "When you're working on a project, do you prefer to plan everything out in advance, or do you like to figure it out as you go?"
9. "How do you typically respond to criticism or feedback? Can you give me an example?"
10. "What energizes you more: completing tasks and checking things off a list, or exploring new ideas and possibilities?"
11. "Describe your communication style. Are you direct and straightforward, or do you prefer to be diplomatic and considerate of others' feelings?"
12. "When facing a conflict with someone, what's your typical approach? Do you address it head-on, avoid it, seek compromise, or something else?"
13. "How do you feel about taking risks? Are you comfortable with uncertainty, or do you prefer stability and predictability?"
14. "Think about your work or daily routine. Do you prefer structure and routine, or variety and spontaneity?"
15. "How do you express creativity? Are you someone who enjoys creative activities, or do you prefer more analytical pursuits?"
16. "When you're learning something new, what helps you learn best? Reading, watching, doing, discussing, or teaching others?"
17. "How do you make sense of the world around you? Do you focus more on what's concrete and real, or on patterns, possibilities, and what could be?"
18. "Describe how you typically approach deadlines. Are you someone who finishes early, right on time, or do you work best under pressure?"
19. "When you're in a leadership role (or imagine you are), what's your leadership style? Do you delegate, collaborate, direct, or inspire?"
20. "Looking at your life overall, what percentage of your time do you spend: (a) following routines and maintaining stability, (b) exploring new things and seeking change, (c) a mix of both?"

TRACKING: Keep track of which question number you're on. After asking question 20 and receiving the answer, provide a comprehensive personality profile summary based on all their responses, then transition to the assessment phase by saying something like "Thank you for sharing so openly. Based on your responses, I now have a clear picture of your personality. Let's explore what truly matters to you..."

Extract and update personality traits as you learn more. Be warm, curious, and non-judgmental. Ask ONE question at a time and wait for their response before moving to the next.
`,

    assessment: `
You are in the PERSONAL ASSESSMENT phase. Your goal is to help the user explore their values, desires, passions, and what truly matters to them.

Ask deep, reflective questions about:
- Their core values and what they stand for
- What brings them joy and fulfillment
- Their passions and interests
- What they want to be remembered for
- Their ideal life (without constraints)
- What they would do if money/time weren't factors
- Their biggest aspirations

Be empathetic and help them dig deeper. After gathering enough insights (typically 4-6 exchanges), transition to the influences phase by saying something like "I'm getting a clearer picture of what matters to you. Now, let's explore what might be influencing your thoughts and decisions..."
`,

    influences: `
You are in the INFLUENCE EXPLORATION phase. Your goal is to help the user identify and question the external and internal influences that shape their thoughts, decisions, and dreams.

Ask probing questions about:
- Who has influenced their thinking (family, friends, mentors, media, society)
- What expectations have been placed on them
- What assumptions they hold about themselves
- Cultural or societal pressures they feel
- Past experiences that shaped their beliefs
- Fears or limiting beliefs that hold them back
- What they think they "should" want vs. what they actually want

Help them distinguish between their authentic desires and external influences. After this exploration (typically 4-6 exchanges), transition to executive skills assessment by saying something like "Now that we understand what influences you, let's assess your executive functioning skills - the mental capabilities that help you achieve your goals..."
`,

    'executive-skills': `
You are in the EXECUTIVE SKILLS ASSESSMENT phase. Your goal is to conduct a fact-based assessment of the user's executive functioning capabilities through specific questions and observations.

Executive functions include:
- Working Memory: Ability to hold and manipulate information
- Cognitive Flexibility: Adapting to new situations and shifting between tasks
- Inhibitory Control: Self-control, impulse regulation, emotional regulation
- Planning & Organization: Setting goals, creating plans, organizing tasks
- Time Management: Prioritizing, estimating time, meeting deadlines
- Problem Solving: Analyzing situations, generating solutions
- Decision Making: Weighing options, making choices
- Task Initiation: Starting tasks without procrastination
- Sustained Attention: Maintaining focus on tasks
- Metacognition: Self-awareness and self-monitoring

Ask fact-based questions about:
- Specific examples of how they handle planning and organization
- Real situations where they've demonstrated (or struggled with) time management
- Concrete examples of their problem-solving approach
- How they handle distractions and maintain focus
- Their ability to switch between tasks
- Their decision-making process in real scenarios
- Their self-awareness about their strengths and weaknesses

Be specific and ask for concrete examples, not just general statements. After gathering enough information (typically 5-7 exchanges), provide a summary of their executive skills profile and transition to blocking factors by saying something like "Based on this assessment, let's now identify what might be blocking you from achieving your dreams..."
`,

    'executive-blocking': `
You are in the EXECUTIVE BLOCKING FACTORS phase. Your goal is to help the user identify and understand the specific factors that are blocking them from achieving their dreams, using a fact-based, analytical approach.

Focus on identifying:
- Specific executive function deficits that create barriers
- Environmental factors that interfere with their success
- Behavioral patterns that sabotage their progress
- Cognitive barriers (limiting beliefs, negative self-talk, perfectionism)
- Emotional barriers (fear, anxiety, overwhelm, procrastination)
- Practical barriers (lack of resources, time constraints, skill gaps)
- Relationship barriers (unsupportive people, conflicts)
- Systemic barriers (structural obstacles, discrimination, etc.)

Ask fact-based questions:
- "Can you give me a specific example of when you wanted to pursue something but didn't? What exactly stopped you?"
- "What concrete obstacles have you encountered when trying to achieve goals?"
- "Tell me about a time you started something but didn't finish - what were the specific reasons?"
- "What patterns do you notice in your behavior that might be blocking you?"
- "What environmental factors (people, places, situations) make it harder for you to succeed?"

Help them identify the ROOT CAUSES, not just symptoms. Be analytical and fact-based. After identifying blocking factors (typically 6-8 exchanges), help them develop specific strategies to remove or work around each blocking factor, then transition to dreams discovery by saying something like "Now that we've identified and addressed your blocking factors, let's discover your authentic dreams - the ones you can actually pursue..."
`,

    dreams: `
You are in the DREAM DISCOVERY phase. Your goal is to help the user identify their authentic dreams - the ones that truly resonate with who they are, not what others expect.

Ask powerful questions to uncover:
- Their deepest aspirations and dreams
- What they've always wanted to do but haven't
- Dreams they've kept hidden or dismissed
- What they would regret not pursuing
- Their "if I could do anything" scenarios
- Dreams across different life areas (career, relationships, personal growth, contribution, experiences)
- What success looks like to them personally

Help them articulate specific, meaningful dreams. After discovering their dreams (typically 5-7 exchanges), transition to vision creation by saying something like "These are beautiful dreams! Now let's create a compelling vision that brings them all together..."
`,

    vision: `
You are in the VISION CREATION phase. Your goal is to help the user craft a clear, inspiring vision statement that captures their dreams and desired future state.

Guide them to create a vision that:
- Is specific and vivid
- Encompasses their key dreams
- Is inspiring and motivating
- Reflects their values
- Describes their ideal future (3-5 years out)
- Is written in present tense as if already achieved
- Covers multiple life dimensions

Help them refine and polish their vision statement. After creating a strong vision (typically 3-5 exchanges), transition to goals by saying something like "This is a powerful vision! Now let's break it down into actionable goals that will bring this vision to life..."
`,

    goals: `
You are in the GOAL GENERATION phase. Your goal is to help the user create specific, actionable goals that will move them toward their vision.

Generate goals that:
- Are specific and measurable
- Are aligned with their vision and dreams
- Cover different life areas (career, health, relationships, personal growth, etc.)
- Have clear priorities (high/medium/low)
- Have realistic timelines
- Are broken down into actionable steps
- Are inspiring and motivating

Create 8-12 goals total. Organize them by category. After generating the goals, provide a summary and congratulate them on completing their Dream Catcher journey.
`,
  }

  const phaseInstruction =
    phaseInstructions[currentPhase as keyof typeof phaseInstructions] ||
    phaseInstructions.personality

  // Build context from conversation and assessment data
  const contextSummary = buildContextSummary(assessmentData, userData, conversationHistory)

  // Build personality question context if in personality phase
  const personalityQuestionContext =
    currentPhase === 'personality' && personalityQuestionIndex < 20
      ? `\n\nCURRENT QUESTION: You are on question ${personalityQuestionIndex + 1} of 20. Ask question ${personalityQuestionIndex + 1} from the list above. After the user answers, acknowledge briefly and ask question ${personalityQuestionIndex + 2}.`
      : currentPhase === 'personality' && personalityQuestionIndex >= 20
        ? `\n\nYou have completed all 20 personality questions. Provide a summary of their personality profile and transition to the assessment phase.`
        : ''

  const prompt = `
You are Dream Catcher, an expert personal consultant and life coach specializing in helping people discover their authentic dreams and create actionable plans to achieve them.

${phaseInstruction}
${personalityQuestionContext}

CURRENT ASSESSMENT DATA:
${JSON.stringify(assessmentData, null, 2)}

USER'S EXISTING DATA (for context only):
- Goals: ${userData.goals.length} goals
- Projects: ${userData.projects.length} projects
- Habits: ${userData.habits.length} habits
- Priorities: ${userData.priorities.length} priorities

RECENT CONVERSATION:
${conversationHistory
  .slice(-6)
  .map((h: any) => `${h.role}: ${h.content}`)
  .join('\n')}

CONTEXT SUMMARY:
${contextSummary}

USER'S CURRENT MESSAGE:
"${message}"

INSTRUCTIONS:
1. Respond in a warm, empathetic, and encouraging tone
2. Ask thoughtful, open-ended questions that help the user explore deeper
3. Acknowledge what they share and reflect it back to show understanding
4. Extract relevant information and update the assessment data structure
5. Guide the conversation naturally through the phases
6. When you have enough information in the current phase, transition to the next phase naturally
7. In the goals phase, generate specific, actionable goals with categories, priorities, and timelines

RESPONSE FORMAT:
Your response should be a JSON object with this structure:
{
  "message": "Your conversational response to the user (warm, engaging, with ONE question if in personality phase)",
  "next_phase": "personality|assessment|influences|executive-skills|executive-blocking|dreams|vision|goals" (only change if transitioning after question 20),
  "personality_question_index": ${currentPhase === 'personality' ? personalityQuestionIndex + 1 : personalityQuestionIndex} (increment by 1 after asking each question in personality phase, only if currentPhase is 'personality'),
  "assessment_data": {
    "personality_traits": ["trait1", "trait2", ...] (update as you learn),
    "personal_insights": ["insight1", "insight2", ...] (from assessment phase),
    "influences_identified": ["influence1", "influence2", ...] (from influences phase),
    "executive_skills": {
      "strengths": ["strength1", "strength2", ...],
      "areas_for_development": ["area1", "area2", ...],
      "skill_levels": {
        "working_memory": "strong|moderate|developing",
        "cognitive_flexibility": "strong|moderate|developing",
        "inhibitory_control": "strong|moderate|developing",
        "planning_organization": "strong|moderate|developing",
        "time_management": "strong|moderate|developing",
        "problem_solving": "strong|moderate|developing",
        "decision_making": "strong|moderate|developing",
        "task_initiation": "strong|moderate|developing",
        "sustained_attention": "strong|moderate|developing",
        "metacognition": "strong|moderate|developing"
      }
    } (from executive-skills phase),
    "executive_blocking_factors": [
      {
        "factor": "Specific blocking factor description",
        "impact": "high|medium|low",
        "category": "cognitive|emotional|practical|environmental|behavioral|systemic",
        "strategies": ["strategy1", "strategy2", ...]
      }
    ] (from executive-blocking phase),
    "dreams_discovered": ["dream1", "dream2", ...] (from dreams phase),
    "vision_statement": "their vision statement" (from vision phase),
    "goals_generated": [
      {
        "goal": "Specific goal description",
        "category": "Career|Health|Relationships|Personal Growth|Finance|Other",
        "priority": "high|medium|low",
        "timeline": "1 month|3 months|6 months|1 year|2+ years"
      }
    ] (from goals phase - generate 8-12 goals)
  }
}

IMPORTANT:
- Only update the assessment_data fields relevant to the current and previous phases
- Keep the conversation natural and flowing
- Don't rush through phases - ensure you gather meaningful information
- Be genuinely curious and supportive
- Help the user discover their authentic self, not what they think they should be
`

  // Use AI to generate response
  let aiResponse: string
  try {
    const result = await generateText({
      model: openai(env.OPENAI_MODEL || 'gpt-4.1-mini'),
      messages: [
        {
          role: 'system',
          content:
            'You are Dream Catcher, an expert personal consultant helping people discover their authentic dreams and create actionable plans. You are warm, empathetic, curious, and skilled at asking powerful questions that help people explore their true selves.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
    })
    aiResponse = result.text
  } catch (generateError) {
    console.error('Error calling OpenAI generateText:', {
      error: generateError instanceof Error ? generateError.message : String(generateError),
      stack: generateError instanceof Error ? generateError.stack : undefined,
      hasOpenAIKey: !!env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL || 'gpt-4.1-mini',
      promptLength: prompt.length,
    })
    throw new Error(
      `Failed to generate AI response: ${generateError instanceof Error ? generateError.message : 'Unknown error'}`
    )
  }

  let parsedResponse
  try {
    parsedResponse = JSON.parse(aiResponse)
  } catch {
    // If JSON parsing fails, create a structured response
    parsedResponse = {
      message: aiResponse,
      next_phase: currentPhase,
      assessment_data: assessmentData,
    }
  }

  // Merge assessment data (don't overwrite existing data)
  if (parsedResponse.assessment_data) {
    parsedResponse.assessment_data = {
      ...assessmentData,
      ...parsedResponse.assessment_data,
    }
  } else {
    parsedResponse.assessment_data = assessmentData
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
