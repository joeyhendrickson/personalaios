import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getHealthConnection, HEALTH_PROVIDER } from '@/lib/fitness/provider-connection'
import { isGoogleHealthConfigured } from '@/lib/google-health'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const connection = await getHealthConnection(supabase, user.id)

    return NextResponse.json({
      configured: isGoogleHealthConfigured(),
      connected: !!connection,
      status: connection?.status ?? null,
      connected_email: connection?.connected_email ?? null,
      last_synced_at: connection?.last_synced_at ?? null,
      last_sync_error: connection?.last_sync_error ?? null,
      preferences: connection
        ? {
            import_sleep: connection.import_sleep,
            import_resting_heart_rate: connection.import_resting_heart_rate,
            import_steps: connection.import_steps,
          }
        : null,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load status' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const update: Record<string, boolean> = {}
    if (typeof body.import_sleep === 'boolean') update.import_sleep = body.import_sleep
    if (typeof body.import_resting_heart_rate === 'boolean')
      update.import_resting_heart_rate = body.import_resting_heart_rate
    if (typeof body.import_steps === 'boolean') update.import_steps = body.import_steps

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid preferences provided' }, { status: 400 })
    }

    const { error } = await supabase
      .from('fitness_provider_connections')
      .update(update)
      .eq('user_id', user.id)
      .eq('provider', HEALTH_PROVIDER)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
