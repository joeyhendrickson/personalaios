import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processMboxImportJob } from '@/lib/relationship-manager/mbox/process-mbox-import-job'

export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const jobId = typeof body.jobId === 'string' ? body.jobId : null

    if (jobId) {
      const result = await processMboxImportJob(supabase, { jobId, userId: user.id })
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ ok: true, jobId })
    }

    const { data: pending } = await supabase
      .from('relationship_import_jobs')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!pending?.id) {
      return NextResponse.json({ ok: true, message: 'No pending jobs' })
    }

    const result = await processMboxImportJob(supabase, {
      jobId: pending.id as string,
      userId: user.id,
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({ ok: true, jobId: pending.id })
  } catch (e) {
    console.log('[mbox-import]', { phase: 'process_route_error' })
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Process failed' },
      { status: 500 }
    )
  }
}
