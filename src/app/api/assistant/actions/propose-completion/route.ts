import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { detectCompletionIntent } from '@/lib/assistant/detect-completion-intent'
import { matchDashboardItemsForCompletion } from '@/lib/assistant/match-dashboard-items'
import { formatProposalPreview } from '@/lib/assistant/proposal-schemas'

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { message } = bodySchema.parse(await req.json())
    const intent = detectCompletionIntent(message)
    if (!intent) {
      return NextResponse.json({ matches: [], proposals: [] })
    }

    const [{ data: tasks }, { data: habits }] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, status')
        .eq('user_id', user.id)
        .neq('status', 'completed'),
      supabase
        .from('daily_habits')
        .select('id, title')
        .eq('user_id', user.id)
        .eq('is_active', true),
    ])

    const matches = matchDashboardItemsForCompletion(
      intent.query,
      (tasks || []) as Array<{ id: string; title: string; status: string }>,
      (habits || []) as Array<{ id: string; title: string }>
    )

    if (matches.length === 0) {
      return NextResponse.json({
        matches: [],
        proposals: [],
        query: intent.query,
        message: intent.query
          ? `No open task or habit matched "${intent.query}". Try the exact title or tap the item on your dashboard.`
          : 'Tell me which task or habit you finished, for example: "I finished my workout task".',
      })
    }

    const proposals: Array<{
      id: string
      action_type: 'complete_task' | 'complete_habit'
      preview: string
      payload: Record<string, unknown>
      title: string
      score: number
    }> = []

    for (const match of matches) {
      const actionType = match.kind === 'task' ? 'complete_task' : 'complete_habit'
      const payload =
        match.kind === 'task'
          ? { task_id: match.id, title: match.title }
          : { habit_id: match.id, title: match.title }

      const { data, error } = await supabase
        .from('assistant_action_proposals')
        .insert({
          user_id: user.id,
          action_type: actionType,
          payload,
          sort_order: 0,
        })
        .select('id')
        .single()

      if (error || !data) continue

      proposals.push({
        id: data.id as string,
        action_type: actionType,
        preview: formatProposalPreview(actionType, payload),
        payload,
        title: match.title,
        score: match.score,
      })
    }

    return NextResponse.json({
      query: intent.query,
      matches: matches.map((m) => ({ kind: m.kind, title: m.title, score: m.score })),
      proposals,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to propose completion' },
      { status: 500 }
    )
  }
}
