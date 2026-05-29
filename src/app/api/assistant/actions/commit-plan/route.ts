import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import {
  commitProposal,
  loadProposalForCommit,
  markProposalCommitted,
  sortProposalsForCommit,
  type CommitContext,
} from '@/lib/assistant/commit-proposal'
import type { ActionProposalRow } from '@/lib/assistant/proposal-schemas'

const bodySchema = z.object({
  planGroupId: z.string().uuid(),
})

function normTitle(title: string) {
  return title.trim().toLowerCase()
}

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
    const { planGroupId } = bodySchema.parse(await req.json())

    const { data: rows, error } = await supabase
      .from('assistant_action_proposals')
      .select('*')
      .eq('user_id', user.id)
      .eq('plan_group_id', planGroupId)
      .eq('status', 'proposed')

    if (error || !rows?.length) {
      return NextResponse.json({ error: 'No pending proposals in this plan' }, { status: 404 })
    }

    const ctx: CommitContext = {
      goalTitleToId: new Map(),
      projectTitleToId: new Map(),
    }

    const [{ data: existingGoals }, { data: existingProjects }] = await Promise.all([
      supabase.from('goals').select('id, title').eq('user_id', user.id),
      supabase
        .from('projects')
        .select('id, title')
        .eq('user_id', user.id)
        .eq('is_completed', false),
    ])

    for (const g of existingGoals || []) {
      ctx.goalTitleToId.set(normTitle(g.title as string), g.id as string)
    }
    for (const p of existingProjects || []) {
      ctx.projectTitleToId.set(normTitle(p.title as string), p.id as string)
    }

    const sorted = sortProposalsForCommit(rows as ActionProposalRow[])
    const committed: Array<{ id: string; kind: string; title: string }> = []
    const errors: Array<{ id: string; error: string }> = []

    for (const row of sorted) {
      try {
        const fresh = await loadProposalForCommit(supabase, user.id, row.id)
        const result = await commitProposal(supabase, user.id, fresh, ctx)
        await markProposalCommitted(supabase, user.id, row.id)
        committed.push({
          id: row.id,
          kind: result.kind,
          title: (result.record.title as string) || row.action_type,
        })
      } catch (e) {
        errors.push({
          id: row.id,
          error: e instanceof Error ? e.message : 'Commit failed',
        })
      }
    }

    return NextResponse.json({
      status: errors.length === 0 ? 'committed' : 'partial',
      committed,
      errors,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to commit plan' },
      { status: 500 }
    )
  }
}
