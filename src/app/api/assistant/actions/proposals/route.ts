import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { formatProposalPreview } from '@/lib/assistant/proposal-schemas'

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const planGroupId = new URL(req.url).searchParams.get('planGroupId')

  let query = supabase
    .from('assistant_action_proposals')
    .select('id, action_type, payload, plan_group_id, sort_order, status, created_at')
    .eq('user_id', user.id)
    .eq('status', 'proposed')
    .order('sort_order', { ascending: true })

  if (planGroupId) {
    query = query.eq('plan_group_id', planGroupId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const proposals = (data || []).map((row) => ({
    id: row.id,
    action_type: row.action_type,
    plan_group_id: row.plan_group_id,
    sort_order: row.sort_order,
    preview: formatProposalPreview(
      row.action_type as 'create_goal' | 'create_project' | 'create_task',
      row.payload as Record<string, unknown>
    ),
  }))

  return NextResponse.json({ proposals })
}
