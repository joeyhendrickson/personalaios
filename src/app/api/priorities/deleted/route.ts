import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/priorities/deleted - Get all soft-deleted priorities for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: deletedPriorities, error: prioritiesError } = await supabase
      .from('priorities')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })

    console.log(
      'Deleted priorities details:',
      deletedPriorities?.map((p) => ({
        id: p.id,
        title: p.title,
        project_id: p.project_id,
        task_id: p.task_id,
        priority_type: p.priority_type,
        source_type: p.source_type,
        is_deleted: p.is_deleted,
      }))
    )

    if (prioritiesError) {
      console.error('Error fetching deleted priorities:', prioritiesError)
      return NextResponse.json({ error: 'Failed to fetch deleted priorities' }, { status: 500 })
    }

    return NextResponse.json({ deletedPriorities: deletedPriorities || [] }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
