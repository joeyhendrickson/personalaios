import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { defaultOpenaiModel } from '@/lib/ai/default-openai-model'
import { buildUserVisionContext } from '@/lib/dating-manager/context'

// GET: fetch the stored partner criteria for this user
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data } = await supabase
      .from('dating_partner_criteria')
      .select('summary, criteria, generated_at')
      .eq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({ criteria: data ?? null })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch criteria' },
      { status: 500 }
    )
  }
}

// POST: (re)generate partner criteria from the user's goals/projects/priorities/habits
export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vision = await buildUserVisionContext(supabase, user.id)

    const { text } = await generateText({
      model: defaultOpenaiModel(),
      prompt: `You are a wise dating coach. Based ONLY on what this person is building in their life, infer what they genuinely NEED in a long-term partner (not just want). Distinguish needs that support their vision from surface-level preferences.

${vision.combined}

Return ONLY valid JSON:
{
  "summary": "3-5 sentences describing what this person needs in a partner to thrive, grounded in their vision",
  "core_needs": ["the non-negotiables that support their life direction"],
  "supportive_traits": ["traits that would amplify their goals/habits"],
  "watch_outs": ["dynamics or traits that would derail their vision"],
  "lifestyle_fit": ["practical compatibility factors implied by their projects/habits"]
}`,
      temperature: 0.4,
    })

    let parsed: Record<string, unknown> = { raw: text }
    try {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) parsed = JSON.parse(match[0]) as Record<string, unknown>
    } catch {
      /* keep raw */
    }

    const summary = typeof parsed.summary === 'string' ? parsed.summary : ''
    const generated_at = new Date().toISOString()

    await supabase.from('dating_partner_criteria').upsert(
      {
        user_id: user.id,
        summary,
        criteria: parsed,
        generated_at,
      },
      { onConflict: 'user_id' }
    )

    return NextResponse.json({ criteria: { summary, criteria: parsed, generated_at } })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to generate criteria' },
      { status: 500 }
    )
  }
}
