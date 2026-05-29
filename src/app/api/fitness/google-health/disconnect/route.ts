import { NextResponse } from 'next/server'
import axios from 'axios'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { getHealthConnection, HEALTH_PROVIDER } from '@/lib/fitness/provider-connection'

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const connection = await getHealthConnection(supabase, user.id)

    // Best-effort token revocation at Google; ignore failures.
    if (connection?.access_token) {
      try {
        await axios.post(
          'https://oauth2.googleapis.com/revoke',
          new URLSearchParams({ token: decrypt(connection.access_token) }),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        )
      } catch (e) {
        console.error('Google token revoke failed (continuing):', e)
      }
    }

    const { error } = await supabase
      .from('fitness_provider_connections')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', HEALTH_PROVIDER)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to disconnect' },
      { status: 500 }
    )
  }
}
