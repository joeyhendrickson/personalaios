import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/priorities/remove-duplicates - Remove duplicate priorities based on title and type
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

    console.log('Removing duplicate priorities for user:', user.id)

    // Get all active priorities
    const { data: priorities, error: fetchError } = await supabase
      .from('priorities')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true }) // Keep the oldest ones

    if (fetchError) {
      console.error('Error fetching priorities:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch priorities' }, { status: 500 })
    }

    if (!priorities || priorities.length === 0) {
      return NextResponse.json(
        {
          message: 'No priorities to check for duplicates',
          removedCount: 0,
        },
        { status: 200 }
      )
    }

    // Group priorities by title and priority_type to find duplicates
    const groupedPriorities = new Map<string, any[]>()

    for (const priority of priorities) {
      const key = `${priority.title}|${priority.priority_type}`
      if (!groupedPriorities.has(key)) {
        groupedPriorities.set(key, [])
      }
      groupedPriorities.get(key)!.push(priority)
    }

    // Find duplicates (groups with more than 1 item)
    const duplicates = []
    for (const [key, group] of groupedPriorities) {
      if (group.length > 1) {
        // Keep the first (oldest) one, mark the rest as duplicates
        duplicates.push(...group.slice(1))
      }
    }

    if (duplicates.length === 0) {
      return NextResponse.json(
        {
          message: 'No duplicate priorities found',
          removedCount: 0,
        },
        { status: 200 }
      )
    }

    // Soft delete the duplicates
    const duplicateIds = duplicates.map((d) => d.id)
    const { error: deleteError } = await supabase
      .from('priorities')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .in('id', duplicateIds)

    if (deleteError) {
      console.error('Error removing duplicates:', deleteError)
      return NextResponse.json({ error: 'Failed to remove duplicate priorities' }, { status: 500 })
    }

    console.log(
      `Removed ${duplicates.length} duplicate priorities:`,
      duplicates.map((d) => ({ id: d.id, title: d.title }))
    )

    return NextResponse.json(
      {
        message: `Successfully removed ${duplicates.length} duplicate priorities`,
        removedCount: duplicates.length,
        duplicates: duplicates.map((d) => ({
          id: d.id,
          title: d.title,
          priority_type: d.priority_type,
        })),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error removing duplicate priorities:', error)
    return NextResponse.json(
      {
        error: 'Failed to remove duplicate priorities',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
