import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'

function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron')

  if (isVercelCron) return true
  if (!cronSecret) {
    return process.env.NODE_ENV === 'development'
  }
  return authHeader === `Bearer ${cronSecret}`
}

/**
 * Daily / hourly: find due relationship reminders, write import_logs-style audit, enqueue work.
 * Does not auto-send SMS/email (explicit user action required elsewhere).
 */
export async function GET(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const now = new Date().toISOString()

    const { data: due, error } = await supabase
      .from('relationship_reminders')
      .select('id, user_id, relationship_id, reminder_type, payload')
      .eq('status', 'scheduled')
      .lte('fire_at', now)
      .limit(500)

    if (error) {
      console.error('[cron/relationships]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = due ?? []
    for (const r of rows) {
      await supabase.from('relationship_import_logs').insert({
        user_id: r.user_id,
        source: 'cron_reminder_due',
        message: `Reminder ${r.id} due (${r.reminder_type})`,
        rows_upserted: 0,
        rows_skipped: 0,
      })
    }

    return NextResponse.json({
      ok: true,
      dueCount: rows.length,
      at: now,
      note: 'Reminders logged; wire push/email in Phase 2 with user consent flags.',
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
