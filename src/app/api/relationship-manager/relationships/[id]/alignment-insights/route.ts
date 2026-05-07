import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { buildRelationshipContextBundle } from '@/lib/relationship-manager/context-bundle'
import { defaultOpenaiModel } from '@/lib/ai/default-openai-model'

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: relationshipId } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: rel } = await supabase
      .from('relationships')
      .select('id, name')
      .eq('id', relationshipId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!rel) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const [bundle, goalsRes, weeklyRes, prioritiesRes] = await Promise.all([
      buildRelationshipContextBundle(supabase, user.id, relationshipId),
      supabase
        .from('goals')
        .select('title, description, goal_type, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('priority_level', { ascending: true })
        .limit(12),
      supabase
        .from('projects')
        .select('title, description, category, is_completed')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .order('updated_at', { ascending: false })
        .limit(15),
      supabase
        .from('priorities')
        .select('title, description, priority_type')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .order('created_at', { ascending: false })
        .limit(12),
    ])

    const goalsText =
      goalsRes.data
        ?.map((g) => `- [${g.goal_type}] ${g.title}: ${g.description || ''}`)
        .join('\n') || '(No active high-level goals recorded.)'

    const projectsText =
      weeklyRes.data
        ?.map((w) => `- ${w.title}: ${w.description || ''} (${w.category})`)
        .join('\n') || '(No active weekly projects.)'

    const prioritiesText =
      prioritiesRes.data?.map((p) => `- ${p.title}: ${p.description || ''}`).join('\n') ||
      '(No priorities list.)'

    const { text } = await generateText({
      model: defaultOpenaiModel(),
      prompt: `Analyze how the relationship with "${rel.name}" supports or could support the user's direction.

RELATIONSHIP PROFILE & CONTEXT:
${bundle.profileText}

DOCUMENT / THREAD SIGNALS:
${bundle.documentContext.slice(0, 2500)}

${bundle.screenshotContext.slice(0, 2500)}

USER GOALS:
${goalsText}

USER PROJECTS (dashboard "projects" table — not USER GOALS rows from the goals feature):
${projectsText}

USER PRIORITIES:
${prioritiesText}

Return ONLY valid JSON with this shape:
{
  "alignment_summary": "2-4 sentences",
  "alignment_score_0_100": number,
  "positioning_ideas": ["short bullet", "..."],
  "mutually_beneficial_deals": [{"title": "", "outline": "2-3 sentences"}],
  "risks_or_blind_spots": ["optional"],
  "next_conversation_hooks": ["specific topics tied to their interests + your goals"]
}`,
      temperature: 0.35,
    })

    let parsed: Record<string, unknown> = { raw: text }
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>
      }
    } catch {
      /* keep raw */
    }

    return NextResponse.json({ insights: parsed })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
