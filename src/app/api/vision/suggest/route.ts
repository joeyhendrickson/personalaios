import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { resolveOpenAIModelId } from '@/lib/ai/openai-model-id'
import { createClient } from '@/lib/supabase/server'

type GoalRow = {
  title: string | null
  status: string | null
  goal_type?: string | null
  target_value?: number | null
  target_unit?: string | null
}

function buildFallbackVision(active: GoalRow[], completed: GoalRow[]): string {
  const activeTitles = active.map((g) => g.title).filter(Boolean) as string[]
  if (activeTitles.length === 0 && completed.length > 0) {
    return 'I have followed through on what I set out to do, and I keep building on that momentum by setting new, meaningful goals.'
  }
  if (activeTitles.length === 0) {
    return 'I am intentional about my growth, focusing my energy on the goals that move my life forward.'
  }
  const list =
    activeTitles.length <= 2
      ? activeTitles.join(' and ')
      : `${activeTitles.slice(0, -1).join(', ')}, and ${activeTitles[activeTitles.length - 1]}`
  return `I am building a life centered on ${list}. Each day I take focused action toward these goals, becoming the person who achieves them.`
}

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: goalsData } = await supabase
      .from('goals')
      .select('title, status, goal_type, target_value, target_unit')
      .eq('user_id', user.id)

    const goals = (goalsData || []) as GoalRow[]
    const active = goals.filter((g) => (g.status || '').toLowerCase() !== 'completed')
    const completed = goals.filter((g) => (g.status || '').toLowerCase() === 'completed')

    const { data: visionRow } = await supabase
      .from('user_vision')
      .select('vision_statement')
      .eq('user_id', user.id)
      .maybeSingle()
    const currentVision = visionRow?.vision_statement?.trim() || ''

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
      return NextResponse.json({ suggestion: buildFallbackVision(active, completed) })
    }

    const fmt = (g: GoalRow) =>
      `- ${g.title}${
        g.target_value != null && g.target_unit
          ? ` (target: ${g.target_value} ${g.target_unit})`
          : ''
      }`

    const prompt = `You are helping a user keep their personal VISION STATEMENT aligned with their current goals.

CURRENT VISION STATEMENT:
${currentVision || '(none yet)'}

ACTIVE GOALS:
${active.map(fmt).join('\n') || '(none)'}

RECENTLY COMPLETED GOALS:
${completed.map(fmt).join('\n') || '(none)'}

Write an updated vision statement that:
- Is 1-3 sentences, first person ("I"), present/aspirational tense.
- Reflects and is aligned with the user's ACTIVE goals (this is most important).
- Honors progress already made on completed goals, without dwelling on them.
- Is warm, motivating, and specific — not generic platitudes.
- Preserves the spirit/voice of the current vision statement if one exists.

Return ONLY the vision statement text. No quotes, no preamble, no markdown.`

    const { text } = await generateText({
      model: openai(resolveOpenAIModelId()),
      messages: [
        { role: 'system', content: 'Return only the vision statement text.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    })

    const suggestion = text
      .trim()
      .replace(/^["']|["']$/g, '')
      .slice(0, 2000)
    return NextResponse.json({
      suggestion: suggestion || buildFallbackVision(active, completed),
    })
  } catch (error) {
    console.error('Error in vision suggest API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to suggest a vision update' },
      { status: 500 }
    )
  }
}
