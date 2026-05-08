import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { resolveOpenAIModelId } from '@/lib/ai/openai-model-id'

const bodySchema = z.object({
  choice: z.enum(['new', 'returning']).optional(),
  answer: z.string().optional(),
})

type OnboardingRow = {
  user_id: string
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped'
  step: number
  responses: Record<string, unknown>
}

function nextQuestion(step: number): string {
  // Deterministic scaffolding; AI refinement happens when generating recommendations.
  switch (step) {
    case 1:
      return `If the next 6 months go really well, what changes in your life? (Career, health, relationships, money, meaning—anything.)`
    case 2:
      return `Which 1–2 areas matter most right now, and why?`
    case 3:
      return `What’s currently getting in the way (biggest blocker)?`
    case 4:
      return `Realistically, how much time/energy do you have each week to work on this?`
    case 5:
      return `How would you measure progress? What numbers would prove you’re moving forward?`
    default:
      return `Tell me a bit about what you want to improve right now.`
  }
}

async function proposeGoalsFromVision(vision: Record<string, unknown>) {
  const prompt = `You are a productivity coach onboarding a new user.\n\nBased on the user's answers, propose 3-6 QUANTIFIABLE goals.\nReturn ONLY valid JSON (no markdown) with this exact shape:\n{\n  \"goals\": [\n    {\n      \"title\": string,\n      \"description\": string,\n      \"goal_type\": \"weekly\"|\"monthly\"|\"quarterly\"|\"yearly\",\n      \"target_value\": number,\n      \"target_unit\": string,\n      \"priority_level\": 1|2|3|4|5,\n      \"start_date\": \"YYYY-MM-DD\"|null,\n      \"target_date\": \"YYYY-MM-DD\"|null\n    }\n  ]\n}\n\nUser answers JSON:\n${JSON.stringify(vision)}`

  const modelId = resolveOpenAIModelId()
  const { text } = await generateText({
    model: openai(modelId),
    messages: [
      { role: 'system', content: 'Return only valid JSON. No extra text.' },
      { role: 'user', content: prompt },
    ],
  })

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(`Onboarding goal proposal returned non-JSON: ${text.slice(0, 200)}`)
  }

  const schema = z.object({
    goals: z.array(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().default(''),
        goal_type: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
        target_value: z.number(),
        target_unit: z.string().min(1).max(50),
        priority_level: z.number().int().min(1).max(5).default(3),
        start_date: z.string().nullable().optional(),
        target_date: z.string().nullable().optional(),
      })
    ),
  })

  return schema.parse(parsed).goals
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = bodySchema.parse(await req.json())

  const { data: existing } = await supabase
    .from('assistant_onboarding_state')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const row: OnboardingRow =
    (existing as OnboardingRow | null) ??
    ({
      user_id: user.id,
      status: 'not_started',
      step: 0,
      responses: {},
    } as OnboardingRow)

  // Step 0: gate question
  if (row.status === 'not_started' && row.step === 0) {
    if (!body.choice) {
      return NextResponse.json({
        status: 'needs_choice',
        prompt: 'Have you used Lifestacks before, or is your dashboard not set up yet?',
        choices: [
          { id: 'new', label: "I'm new / not set up" },
          { id: 'returning', label: "I've used it" },
        ],
      })
    }

    const status = body.choice === 'new' ? 'in_progress' : 'skipped'
    const nextStep = body.choice === 'new' ? 1 : 0

    await supabase.from('assistant_onboarding_state').upsert(
      {
        user_id: user.id,
        status,
        step: nextStep,
        responses: { ...(row.responses || {}), used_before: body.choice },
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: status === 'skipped' ? new Date().toISOString() : null,
      },
      { onConflict: 'user_id' }
    )

    if (status === 'skipped') {
      return NextResponse.json({ status: 'skipped' })
    }

    return NextResponse.json({
      status: 'question',
      step: 1,
      question: nextQuestion(1),
    })
  }

  if (row.status !== 'in_progress') {
    return NextResponse.json({ status: row.status })
  }

  const step = Math.max(1, row.step || 1)
  const answer = (body.answer || '').trim()
  if (!answer) return NextResponse.json({ error: 'Missing answer' }, { status: 400 })

  const responses = { ...(row.responses || {}), [`q${step}`]: answer }
  const nextStep = step + 1

  // Persist state
  await supabase.from('assistant_onboarding_state').upsert(
    {
      user_id: user.id,
      status: nextStep <= 5 ? 'in_progress' : 'completed',
      step: nextStep <= 5 ? nextStep : 6,
      responses,
      updated_at: new Date().toISOString(),
      completed_at: nextStep <= 5 ? null : new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (nextStep <= 5) {
    return NextResponse.json({
      status: 'question',
      step: nextStep,
      question: nextQuestion(nextStep),
    })
  }

  // Generate recommended goals and store as proposals
  const recommended = await proposeGoalsFromVision(responses)
  const proposals: Array<{ id: string; preview: string; payload: Record<string, unknown> }> = []

  for (const g of recommended) {
    const preview = `${g.title}\n\n${g.description}\n\nType: ${g.goal_type}\nTarget: ${g.target_value} ${g.target_unit}\nPriority: ${g.priority_level}`
    const { data, error } = await supabase
      .from('assistant_action_proposals')
      .insert({
        user_id: user.id,
        action_type: 'create_goal',
        payload: g,
      })
      .select('id')
      .single()
    if (error) continue
    proposals.push({ id: (data as { id: string }).id, preview, payload: g as any })
  }

  return NextResponse.json({
    status: 'recommendations',
    message: `Based on what you shared, here are some quantifiable goal options. Confirm any you want to add to your dashboard.`,
    proposals,
  })
}
