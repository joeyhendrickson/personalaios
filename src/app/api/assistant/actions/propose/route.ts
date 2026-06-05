import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateDashboardPlanFromConversation } from '@/lib/assistant/generate-dashboard-plan'
import { formatProposalPreview } from '@/lib/assistant/proposal-schemas'
import { randomUUID } from 'crypto'

const bodySchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().min(1),
    })
  ),
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
    const { messages } = bodySchema.parse(await req.json())
    const userMessages = messages.filter((m) => m.role === 'user')
    if (userMessages.length === 0) {
      return NextResponse.json({ error: 'No conversation to plan from' }, { status: 400 })
    }

    const [{ data: goals }, { data: projects }, { data: habits }] = await Promise.all([
      supabase
        .from('goals')
        .select('id, title, goal_type, status')
        .eq('user_id', user.id)
        .eq('status', 'active'),
      supabase
        .from('projects')
        .select('id, title')
        .eq('user_id', user.id)
        .eq('is_completed', false),
      supabase.from('daily_habits').select('title').eq('user_id', user.id).eq('is_active', true),
    ])

    const existingGoals = (goals || []).map((g) => ({
      id: g.id as string,
      title: g.title as string,
      goal_type: (g.goal_type as string) || 'monthly',
    }))
    const existingProjects = (projects || []).map((p) => ({
      id: p.id as string,
      title: p.title as string,
    }))
    const existingHabits = (habits || []).map((h) => ({ title: h.title as string }))

    const plan = await generateDashboardPlanFromConversation(
      messages,
      existingGoals,
      existingProjects,
      existingHabits
    )

    const goalIds = new Set(existingGoals.map((g) => g.id))
    for (const item of plan.items) {
      if (item.type === 'create_project' && item.goal_id && !goalIds.has(item.goal_id)) {
        return NextResponse.json(
          { error: `Invalid goal_id for project "${item.title}"` },
          { status: 400 }
        )
      }
    }

    const planGroupId = randomUUID()
    const proposals: Array<{
      id: string
      action_type: string
      preview: string
      sort_order: number
    }> = []

    let sortOrder = 0
    for (const item of plan.items) {
      const actionType = item.type
      const { type: _t, ...payload } = item

      const { data, error } = await supabase
        .from('assistant_action_proposals')
        .insert({
          user_id: user.id,
          action_type: actionType,
          payload,
          plan_group_id: planGroupId,
          sort_order: sortOrder,
        })
        .select('id')
        .single()

      if (error) {
        console.error('Failed to store proposal:', error)
        continue
      }

      proposals.push({
        id: data.id as string,
        action_type: actionType,
        preview: formatProposalPreview(
          actionType as 'create_goal' | 'create_project' | 'create_task' | 'create_habit',
          payload as Record<string, unknown>
        ),
        sort_order: sortOrder,
      })
      sortOrder += 1
    }

    if (proposals.length === 0) {
      return NextResponse.json({ error: 'Failed to save plan proposals' }, { status: 500 })
    }

    return NextResponse.json({
      planGroupId,
      summary: plan.summary,
      proposals,
    })
  } catch (e) {
    console.error('Propose plan error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to generate plan' },
      { status: 500 }
    )
  }
}
