import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: job, error } = await supabase
      .from('relationship_import_jobs')
      .select(
        'id, status, original_file_name, total_messages, imported_messages, skipped_messages, duplicate_messages, total_threads, incoming_count, outgoing_count, date_range_start, date_range_end, error, created_at, started_at, completed_at'
      )
      .eq('id', jobId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error || !job) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ job })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load job' },
      { status: 500 }
    )
  }
}
