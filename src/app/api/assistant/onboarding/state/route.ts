import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED = new Set(['not_started', 'in_progress', 'completed', 'skipped'])

/**
 * Upsert the user's onboarding status. Used by Dream Catcher to mark the flow
 * 'skipped' when a new user exits early so the dashboard stops redirecting them.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const status = typeof body.status === 'string' ? body.status : ''
    if (!ALLOWED.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const { error } = await supabase.from('assistant_onboarding_state').upsert(
      {
        user_id: user.id,
        status,
        updated_at: now,
        ...(status === 'completed' ? { completed_at: now } : {}),
        ...(status === 'in_progress' ? { started_at: now } : {}),
      },
      { onConflict: 'user_id' }
    )

    if (error) {
      // Table missing shouldn't block the user from leaving the flow.
      if (error.code === '42P01') return NextResponse.json({ ok: true, skipped: true })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update onboarding state' },
      { status: 500 }
    )
  }
}
