import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/priorities/cleanup - Permanently delete priorities that have been soft deleted for 24+ hours
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

    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    // Find priorities that have been soft deleted for 24+ hours
    const { data: oldDeletedPriorities, error: fetchError } = await supabase
      .from('priorities')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_deleted', true)
      .lt('deleted_at', twentyFourHoursAgo.toISOString())

    if (fetchError) {
      console.error('Error fetching old deleted priorities:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch old deleted priorities' }, { status: 500 })
    }

    if (!oldDeletedPriorities || oldDeletedPriorities.length === 0) {
      return NextResponse.json(
        {
          message: 'No priorities to clean up',
          deletedCount: 0,
        },
        { status: 200 }
      )
    }

    // Permanently delete these priorities
    const { error: deleteError } = await supabase
      .from('priorities')
      .delete()
      .eq('user_id', user.id)
      .eq('is_deleted', true)
      .lt('deleted_at', twentyFourHoursAgo.toISOString())

    if (deleteError) {
      console.error('Error permanently deleting old priorities:', deleteError)
      return NextResponse.json(
        { error: 'Failed to permanently delete old priorities' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: `Successfully permanently deleted ${oldDeletedPriorities.length} old priorities`,
        deletedCount: oldDeletedPriorities.length,
      },
      { status: 200 }
    )
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
