import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CALENDAR_PROVIDER } from '@/lib/calendar/connection'

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await supabase
      .from('calendar_connections')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', CALENDAR_PROVIDER)

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to disconnect calendar' },
      { status: 500 }
    )
  }
}
