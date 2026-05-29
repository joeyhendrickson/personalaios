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
  proposalId: z.string().uuid(),
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
    const { proposalId } = bodySchema.parse(await req.json())
    const proposal = await loadProposalForCommit(supabase, user.id, proposalId)

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

    if (proposal.plan_group_id) {
      const { data: siblings } = await supabase
        .from('assistant_action_proposals')
        .select('*')
        .eq('user_id', user.id)
        .eq('plan_group_id', proposal.plan_group_id)
        .eq('status', 'proposed')

      const sorted = sortProposalsForCommit((siblings || []) as ActionProposalRow[])
      const targetIndex = sorted.findIndex((p) => p.id === proposalId)

      for (let i = 0; i < targetIndex; i++) {
        const sib = sorted[i]
        try {
          const fresh = await loadProposalForCommit(supabase, user.id, sib.id)
          await commitProposal(supabase, user.id, fresh, ctx)
          await markProposalCommitted(supabase, user.id, sib.id)
        } catch (e) {
          return NextResponse.json(
            {
              error: `Confirm "${sib.action_type}" items above this one first: ${e instanceof Error ? e.message : 'dependency failed'}`,
            },
            { status: 400 }
          )
        }
      }
    }

    const result = await commitProposal(supabase, user.id, proposal, ctx)
    await markProposalCommitted(supabase, user.id, proposalId)

    return NextResponse.json({
      status: 'committed',
      kind: result.kind,
      goal: result.kind === 'goal' ? result.record : undefined,
      project: result.kind === 'project' ? result.record : undefined,
      task: result.kind === 'task' ? result.record : undefined,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to commit' },
      { status: e instanceof Error && e.message.includes('not found') ? 404 : 500 }
    )
  }
}
