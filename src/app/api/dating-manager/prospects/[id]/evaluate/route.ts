import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { defaultOpenaiModel } from '@/lib/ai/default-openai-model'
import { buildUserVisionContext, prospectToText } from '@/lib/dating-manager/context'

// POST: produce an AI evaluation of one prospect against the user's vision + criteria.
export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: prospect } = await supabase
      .from('dating_prospects')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const [vision, criteriaRes, photosRes] = await Promise.all([
      buildUserVisionContext(supabase, user.id),
      supabase
        .from('dating_partner_criteria')
        .select('summary, criteria')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('dating_prospect_photos')
        .select('kind, analysis')
        .eq('prospect_id', id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    const criteriaText = criteriaRes.data?.summary
      ? `PARTNER CRITERIA (what the user needs):\n${criteriaRes.data.summary}`
      : '(Partner criteria not generated yet.)'

    const photoSignals =
      (photosRes.data ?? [])
        .map((p) => {
          const a = (p.analysis || {}) as Record<string, unknown>
          if (p.kind === 'couple') {
            return `Couple photo — connection ${a.connection_score ?? '?'}/100: ${a.emotional_read ?? ''}`
          }
          return `Prospect photo — attractiveness ${a.attractiveness_score ?? '?'}/100: ${a.appearance_summary ?? ''}`
        })
        .join('\n') || '(No photo analyses yet.)'

    const { text } = await generateText({
      model: defaultOpenaiModel(),
      prompt: `You are an insightful, honest dating coach. Evaluate this potential partner for the user, weighing emotional safety and life-alignment far above looks.

${vision.combined}

${criteriaText}

POTENTIAL PARTNER:
${prospectToText(prospect)}

PHOTO SIGNALS:
${photoSignals}

Consider: Do they make the user feel known? Is there control/fighting? Pros vs. cons, positive vs. toxic qualities, and explicitly call out UNKNOWNS the user should investigate. Factor attraction only as one input, and note if attraction may be distracting from misalignment.

Return ONLY valid JSON:
{
  "overall_score": number (0-100, fit for the user's best life),
  "verdict": "one-line takeaway",
  "summary": "3-5 sentences",
  "green_flags": ["..."],
  "red_flags": ["..."],
  "unknowns_to_explore": ["specific things to find out"],
  "alignment_to_vision": "2-3 sentences on how they fit the user's goals/habits/vision",
  "reflective_questions": ["questions for the user to sit with"]
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
        prospect_id: id,
        scope: 'prospect',
        result: parsed,
      })
      .select('result, created_at')
      .single()

    return NextResponse.json({ evaluation: saved ?? { result: parsed } })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to evaluate prospect' },
      { status: 500 }
    )
  }
}
