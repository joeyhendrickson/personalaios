import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const bodySchema = z.object({
  proposalId: z.string().uuid(),
})

const createGoalSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  goal_type: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
  target_value: z.number().min(0),
  target_unit: z.string().min(1).max(50),
  priority_level: z.number().int().min(1).max(5).default(3),
  start_date: z.string().nullable().optional(),
  target_date: z.string().nullable().optional(),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { proposalId } = bodySchema.parse(await req.json())

  const { data: proposal, error } = await supabase
    .from('assistant_action_proposals')
    .select('*')
    .eq('id', proposalId)
    .eq('user_id', user.id)
    .single()

  if (error || !proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
  if (proposal.status !== 'proposed')
    return NextResponse.json({ error: `Proposal is ${proposal.status}` }, { status: 400 })

  const expiresAt = new Date((proposal as any).expires_at as string)
  if (Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
    await supabase
      .from('assistant_action_proposals')
      .update({ status: 'expired' })
      .eq('id', proposalId)
      .eq('user_id', user.id)
    return NextResponse.json({ error: 'Proposal expired' }, { status: 400 })
  }

  if (proposal.action_type !== 'create_goal') {
    return NextResponse.json({ error: 'Unsupported action_type' }, { status: 400 })
  }

  const payload = createGoalSchema.parse((proposal as any).payload)

  const { data: goal, error: insertError } = await supabase
    .from('goals')
    .insert({
      user_id: user.id,
      title: payload.title,
      description: payload.description,
      goal_type: payload.goal_type,
      target_value: payload.target_value,
      target_unit: payload.target_unit,
      current_value: 0,
      priority_level: payload.priority_level,
      start_date: payload.start_date ?? null,
      target_date: payload.target_date ?? null,
      status: 'active',
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  await supabase
    .from('assistant_action_proposals')
    .update({ status: 'committed', committed_at: new Date().toISOString() })
    .eq('id', proposalId)
    .eq('user_id', user.id)

  return NextResponse.json({ status: 'committed', goal }, { status: 200 })
}
