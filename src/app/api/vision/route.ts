import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeGoalsSignature } from '@/lib/vision/goals-signature'

async function loadGoalsSignature(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data: goals } = await supabase.from('goals').select('title, status').eq('user_id', userId)
  const activeGoals = (goals || []).filter((g) => (g.status || '').toLowerCase() !== 'completed')
  return {
    signature: computeGoalsSignature(goals || []),
    hasGoals: (goals || []).length > 0,
    activeGoalCount: activeGoals.length,
  }
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: row } = await supabase
    .from('user_vision')
    .select('vision_statement, goals_signature, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()

  const { signature, hasGoals, activeGoalCount } = await loadGoalsSignature(supabase, user.id)

  const visionStatement = row?.vision_statement?.trim() || ''
  const storedSignature = row?.goals_signature ?? null

  // Recommend an AI update only when there's a saved vision AND the goals have
  // changed since it was last aligned (and there are goals to align to).
  const needsUpdate =
    visionStatement.length > 0 &&
    hasGoals &&
    storedSignature !== null &&
    storedSignature !== signature

  return NextResponse.json({
    vision_statement: visionStatement,
    updated_at: row?.updated_at ?? null,
    has_goals: hasGoals,
    active_goal_count: activeGoalCount,
    needs_update: needsUpdate,
    current_signature: signature,
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const visionStatement = typeof body?.vision_statement === 'string' ? body.vision_statement : ''

  if (visionStatement.trim().length === 0) {
    return NextResponse.json({ error: 'Vision statement cannot be empty.' }, { status: 400 })
  }
  if (visionStatement.length > 2000) {
    return NextResponse.json(
      { error: 'Vision statement is too long (max 2000 characters).' },
      { status: 400 }
    )
  }

  // Align the saved vision to the current goals state.
  const { signature } = await loadGoalsSignature(supabase, user.id)

  const { error } = await supabase.from('user_vision').upsert(
    {
      user_id: user.id,
      vision_statement: visionStatement.trim(),
      goals_signature: signature,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    vision_statement: visionStatement.trim(),
    needs_update: false,
  })
}
