import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { defaultOpenaiModel } from '@/lib/ai/default-openai-model'
import { buildUserVisionContext, prospectToText } from '@/lib/dating-manager/context'

// GET: fetch the most recent overall comparison summary
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data } = await supabase
      .from('dating_evaluations')
      .select('result, created_at')
      .eq('user_id', user.id)
      .eq('scope', 'overall')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ summary: data ?? null })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch summary' },
      { status: 500 }
    )
  }
}

// POST: generate an overall comparison across all active prospects
export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [vision, criteriaRes, prospectsRes] = await Promise.all([
      buildUserVisionContext(supabase, user.id),
      supabase
        .from('dating_partner_criteria')
        .select('summary')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('dating_prospects')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(12),
    ])

    const prospects = prospectsRes.data ?? []
    if (prospects.length === 0) {
      return NextResponse.json(
        { error: 'No active prospects to compare. Add at least one prospect first.' },
        { status: 400 }
      )
    }

    const prospectsText = prospects
      .map((p, i) => `### Prospect ${i + 1} (id: ${p.id})\n${prospectToText(p)}`)
      .join('\n\n')

    const criteriaText = criteriaRes.data?.summary
      ? `PARTNER CRITERIA (what the user needs):\n${criteriaRes.data.summary}`
      : '(Partner criteria not generated yet.)'

    const { text } = await generateText({
      model: defaultOpenaiModel(),
      prompt: `You are an honest, caring dating coach. Compare these potential partners for the user and help them see clearly. Prioritize emotional safety, feeling known, and alignment with the user's life vision over looks.

${vision.combined}

${criteriaText}

POTENTIAL PARTNERS:
${prospectsText}

Return ONLY valid JSON:
{
  "summary": "4-6 sentences synthesizing the overall picture and what the user seems to be drawn to vs. what they need",
  "ranking": [{ "prospect_id": "id", "name": "", "fit_score": number, "one_line": "" }],
  "patterns": ["recurring patterns across the user's choices (e.g. chasing attraction over safety)"],
  "recommendation": "2-4 sentences of grounded guidance",
  "watch_outs": ["overall cautions"]
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

    const { data: saved } = await supabase
      .from('dating_evaluations')
      .insert({
        user_id: user.id,
        prospect_id: null,
        scope: 'overall',
        result: parsed,
      })
      .select('result, created_at')
      .single()

    return NextResponse.json({ summary: saved ?? { result: parsed } })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to generate summary' },
      { status: 500 }
    )
  }
}
