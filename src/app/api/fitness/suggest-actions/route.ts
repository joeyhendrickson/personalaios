import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { env } from '@/lib/env'
import { defaultOpenaiModel } from '@/lib/ai/default-openai-model'

type Suggestion = { title: string; description: string }
type SuggestResult = { habits: Suggestion[]; tasks: Suggestion[] }

function fallbackSuggestions(planType: string): SuggestResult {
  if (planType === 'workout') {
    return {
      habits: [
        {
          title: 'Warm up 5 minutes before every workout',
          description: 'Protect joints and improve performance.',
        },
        {
          title: 'Stretch or mobility work after training',
          description: 'Aid recovery and flexibility.',
        },
        {
          title: 'Hit your daily protein target',
          description: 'Support muscle recovery and growth.',
        },
      ],
      tasks: [
        {
          title: 'Schedule this week’s workouts on your calendar',
          description: 'Block time for each training day.',
        },
        {
          title: 'Prepare gym bag and gear',
          description: 'Remove friction so you never skip a session.',
        },
      ],
    }
  }
  return {
    habits: [
      {
        title: 'Stop eating after 8pm (intermittent fasting)',
        description: 'Support your nutrition plan and digestion.',
      },
      {
        title: 'Drink a glass of water before each meal',
        description: 'Aid hydration and portion control.',
      },
      { title: 'Prep meals the night before', description: 'Stay consistent with your plan.' },
    ],
    tasks: [
      {
        title: 'Update grocery list based on nutrition plan',
        description: 'Shop for this week’s meals and ingredients.',
      },
      {
        title: 'Meal prep for the next 3 days',
        description: 'Batch-cook proteins, grains, and veggies.',
      },
    ],
  }
}

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
    const planType: string = body?.plan_type === 'workout' ? 'workout' : 'nutrition'
    const plan = body?.plan ?? {}

    if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY.trim() === '') {
      return NextResponse.json({ success: true, ...fallbackSuggestions(planType) })
    }

    const prompt = `
You are a habit and productivity coach. Based on the user's ${planType} plan below, suggest:
- 3 to 4 daily HABITS that reinforce the plan (e.g., for nutrition: "Don't eat after 8pm for intermittent fasting").
- 2 to 3 one-off TASKS to set the plan up for success (e.g., "Update grocery list based on nutrition plan").

Keep titles short and actionable (max ~60 chars). Descriptions one sentence.

PLAN (${planType}):
${JSON.stringify(plan, null, 2)}

Respond with ONLY valid JSON in this exact shape:
{
  "habits": [{ "title": "string", "description": "string" }],
  "tasks": [{ "title": "string", "description": "string" }]
}
`

    let result: SuggestResult
    try {
      const { text } = await generateText({
        model: defaultOpenaiModel(),
        messages: [
          {
            role: 'system',
            content:
              'You output strictly valid JSON for habit and task suggestions. No prose, no markdown fences.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      })
      const cleaned = text
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/```$/i, '')
        .trim()
      const parsed = JSON.parse(cleaned)
      result = {
        habits: Array.isArray(parsed?.habits) ? parsed.habits.slice(0, 5) : [],
        tasks: Array.isArray(parsed?.tasks) ? parsed.tasks.slice(0, 5) : [],
      }
      if (result.habits.length === 0 && result.tasks.length === 0) {
        result = fallbackSuggestions(planType)
      }
    } catch (e) {
      console.error('suggest-actions AI error, using fallback:', e)
      result = fallbackSuggestions(planType)
    }

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to suggest actions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
