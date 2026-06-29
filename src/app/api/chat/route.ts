import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { assembleAIContext } from '@/lib/ai-context/assemble-context'
import { ADVISOR_CROSS_MODULE_GUIDELINES } from '@/lib/ai-context/advisory-guidelines'
import { defaultOpenaiModel } from '@/lib/ai/default-openai-model'
import { resolveOpenAIModelId } from '@/lib/ai/openai-model-id'
import { logAfterVercelSdkCall } from '@/lib/ai/usage-logger'
import {
  buildAdvisorLengthInstructions,
  isFactualDataQuestion,
  userWantsMoreDetail,
} from '@/lib/advisor/response-length'

/** Stream `error` parts are often plain objects, not `Error` — `String(obj)` becomes "[object Object]". */
function formatStreamError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  if (err != null && typeof err === 'object') {
    const o = err as Record<string, unknown>
    if (typeof o.message === 'string' && o.message.trim()) return o.message
    try {
      return JSON.stringify(err)
    } catch {
      return 'Unknown error'
    }
  }
  return String(err)
}

/**
 * AI SDK normalizes many chunks to `text`; OpenAI still emits `delta` (string or, for some APIs, structured parts).
 * Missing array-shaped deltas produced empty chat bubbles in production.
 */
function textFromStreamPart(part: unknown): string {
  if (part == null || typeof part !== 'object') return ''
  const p = part as Record<string, unknown>

  if (typeof p.text === 'string' && p.text.length > 0) return p.text

  const delta = p.delta
  if (typeof delta === 'string' && delta.length > 0) return delta
  if (Array.isArray(delta) && delta.length > 0) {
    return delta
      .map((block: unknown) => {
        if (typeof block === 'string') return block
        if (block != null && typeof block === 'object') {
          const b = block as Record<string, unknown>
          if (typeof b.text === 'string') return b.text
          if (b.type === 'text' && typeof b.text === 'string') return b.text
        }
        return ''
      })
      .join('')
  }

  return ''
}

/** Strip UI-only fields (`id`) so OpenAI / the AI SDK always get valid chat messages. */
function sanitizeChatMessages(
  raw: unknown
): { role: 'user' | 'assistant' | 'system'; content: string }[] {
  if (!Array.isArray(raw)) return []
  const out: { role: 'user' | 'assistant' | 'system'; content: string }[] = []
  for (const m of raw) {
    if (m == null || typeof m !== 'object') continue
    const role = (m as { role?: string }).role
    const content = (m as { content?: unknown }).content
    if (role !== 'user' && role !== 'assistant' && role !== 'system') continue
    const text = typeof content === 'string' ? content : ''
    out.push({ role, content: text })
  }
  return out
}

function looksLikeProductivityChallenge(text: string): boolean {
  const t = text.toLowerCase()
  if (t.length < 20) return false
  const hits = [
    'overwhelmed',
    'burnout',
    'burned out',
    'procrast',
    'stuck',
    "can't focus",
    'cant focus',
    'too many',
    'unmotivated',
    'anxious',
    'stress',
    'behind',
    'avoid',
    'adhd',
    'time management',
    'no time',
    'not finishing',
    'not completing',
    'not making progress',
  ]
  return hits.some((h) => t.includes(h))
}

export async function POST(req: Request) {
  const requestStartMs = Date.now()
  let logUserId: string | null = null
  try {
    const { messages: rawMessages, language = 'en', currentModule } = await req.json()
    const messages = sanitizeChatMessages(rawMessages)
    console.log('Chat API called with messages:', messages.length, 'language:', language)

    if (messages.length === 0) {
      return Response.json({ error: 'No valid messages' }, { status: 400 })
    }

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

    logUserId = user.id
    console.log('Chat API user authenticated:', user.id)

    // Best-effort: log user-reported productivity challenges for admin review.
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || ''
    if (looksLikeProductivityChallenge(lastUserMsg)) {
      try {
        await supabase.from('user_reported_challenges').insert({
          user_id: user.id,
          source: 'productivity_advisor',
          message: lastUserMsg.slice(0, 4000),
          context: 'Captured from Productivity Advisor conversation',
          tags: ['productivity', 'coaching'],
          severity: lastUserMsg.toLowerCase().includes('burnout') ? 'high' : 'normal',
          status: 'open',
        })
      } catch {
        // ignore
      }
    }

    const { systemContext, usedCache, sourceChips } = await assembleAIContext(user.id, {
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : '',
      })),
      currentModule: typeof currentModule === 'string' ? currentModule : undefined,
    })

    if (usedCache) {
      console.log('Chat API using cached context')
    }

    console.log('Calling OpenAI with user context...')

    const wantsMoreDetail = userWantsMoreDetail(messages)
    const factualQuestion = isFactualDataQuestion(lastUserMsg)
    const lengthInstructions = buildAdvisorLengthInstructions(
      language,
      wantsMoreDetail,
      factualQuestion
    )

    const startMs = Date.now()
    const modelId = resolveOpenAIModelId()
    const result = await streamText({
      model: defaultOpenaiModel(),
      messages,
      system: `You are the Lifestacks Advisor — an intelligent AI assistant for a Personal AI OS. You have access to the user's dashboard data AND detailed MODULE CONTEXT from their installed life modules. Ground advice in real data; help the user feel known.

${systemContext}

${ADVISOR_CROSS_MODULE_GUIDELINES}

${lengthInstructions}

CORE CAPABILITIES:
1. **Personalized Advice**: Analyze user's data to provide specific, actionable recommendations
2. **Category Analysis**: Understand user's focus areas and suggest improvements
3. **Dashboard planning**: User can tap "Add to dashboard" or ask you to add goals, projects, tasks, or habits — the app then shows proposal cards; nothing is saved until they tap Confirm & Add or Confirm all
3b. **Marking progress**: When the user says they finished a task or habit, the app may show completion proposal cards — nothing is marked complete until they confirm. Never claim a task or habit is done unless they confirmed the card.
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

DASHBOARD CHANGES (critical — never violate):
- You CANNOT directly create, edit, delete, or complete goals, projects, tasks, or habits in chat. The database is only updated when the user confirms proposal cards in the chat UI.
- NEVER say you added, created, updated, saved, completed, or removed dashboard items unless the user has already tapped Confirm & Add or Confirm all and you know it succeeded.
- When the user asks to add a habit, goal, project, or task, say you are preparing it for their review (or that they should confirm the proposal cards shown below). Do not claim it is already on the dashboard.
- When the user says they finished something, acknowledge it warmly and point them to the completion confirmation card if one appears — do not claim it is already checked off.
- If no proposal cards are visible yet, tell them you will build a dashboard proposal from the conversation — they must confirm before anything appears on the dashboard.
- Prefer one focused proposal at a time when suggesting new dashboard items; avoid long batch lists unless the user asked for a full plan.

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
      onFinish: async ({ usage }) => {
        await logAfterVercelSdkCall({
          startMs,
          userId: user.id,
          module: 'chat',
          action: 'generate_chat_response',
          route: '/api/chat',
          model: modelId,
          description: 'Generated chat response using current user context.',
          result: { usage },
        })
      },
    })

    console.log('OpenAI response generated successfully')

    // Single consumer of `fullStream` only. Do not call `await result.text` after — it runs `consumeStream()`
    // again on a fresh tee of the same pipeline and often returns empty (blank bubbles on Vercel).
    // GPT-5 / Responses API: assistant text may stream as text-delta and/or reasoning-delta; both use `text` or `delta`.
    const encoder = new TextEncoder()
    const plainTextStream = new ReadableStream({
      async start(controller) {
        let wrote = false
        try {
          for await (const part of result.fullStream) {
            if (part.type === 'error') {
              const msg = formatStreamError(part.error)
              controller.enqueue(encoder.encode(`\n[Error] ${msg}`))
              wrote = true
              break
            }
            if (part.type === 'text-delta' || part.type === 'reasoning-delta') {
              const chunk = textFromStreamPart(part)
              if (chunk) {
                wrote = true
                controller.enqueue(encoder.encode(chunk))
              }
            }
          }
          if (!wrote) {
            controller.enqueue(
              encoder.encode(
                'No response text was streamed. Check Vercel function logs for /api/chat, OPENAI_API_KEY, and model access. If this persists, try again in a minute.'
              )
            )
          }
        } catch (e) {
          const msg = formatStreamError(e)
          controller.enqueue(encoder.encode(`\n[Error] ${msg}`))
        }
        controller.close()
      },
    })

    return new Response(plainTextStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        ...(sourceChips?.length ? { 'X-Advisor-Sources': JSON.stringify(sourceChips) } : {}),
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    if (logUserId) {
      await logAfterVercelSdkCall({
        startMs: requestStartMs,
        userId: logUserId,
        module: 'chat',
        action: 'generate_chat_response',
        route: '/api/chat',
        model: resolveOpenAIModelId(),
        description: 'Generated chat response using current user context.',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
    return new Response(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, {
      status: 500,
    })
  }
}
