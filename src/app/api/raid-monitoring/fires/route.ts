import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: fires, error } = await supabase
      .from('raid_monitoring_fires')
      .select(
        `
        *,
        raid_monitoring_entries (
          id,
          type,
          title,
          description,
          severity,
          priority_score,
          status,
          owner,
          due_date
        )
      `
      )
      .eq('user_id', user.id)
      .order('triggered_at', { ascending: false })

    if (error) {
      console.error('Error fetching fire events:', error)
      return NextResponse.json({ error: 'Failed to fetch fire events' }, { status: 500 })
    }

    // Parse JSON fields and flatten the structure
    const parsedFires = (fires || []).map((fire) => ({
      id: fire.id,
      user_id: fire.user_id,
      job_id: fire.job_id,
      raid_id: fire.raid_id,
      triggered_at: fire.triggered_at,
      trigger_rule: fire.trigger_rule,
      priority_score: fire.priority_score,
      severity: fire.severity,
      next_actions:
        typeof fire.next_actions === 'string' ? JSON.parse(fire.next_actions) : fire.next_actions,
      status: fire.status,
      raid_entry: fire.raid_monitoring_entries,
    }))

    return NextResponse.json({
      fires: parsedFires,
      message: 'Fire events fetched successfully',
    })
  } catch (error) {
    console.error('Error in fires GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
