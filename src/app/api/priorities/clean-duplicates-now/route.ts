import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/priorities/clean-duplicates-now - Remove duplicate priorities immediately
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

    console.log('🧹 CLEANING DUPLICATE PRIORITIES for user:', user.id)

    // Fetch all non-deleted priorities for the user
    const { data: priorities, error: fetchError } = await supabase
      .from('priorities')
      .select('id, title, priority_type, is_deleted, created_at')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true }) // Keep oldest first

    if (fetchError) {
      console.error('Error fetching priorities for duplicate check:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch priorities' }, { status: 500 })
    }

    if (!priorities || priorities.length === 0) {
      return NextResponse.json(
        { message: 'No priorities to check for duplicates' },
        { status: 200 }
      )
    }

    console.log(`📊 Found ${priorities.length} priorities to check for duplicates`)

    // Group priorities by title and priority_type
    const groupedPriorities = new Map<string, any[]>()

    for (const priority of priorities) {
      const key = `${priority.title}|${priority.priority_type}`
      if (!groupedPriorities.has(key)) {
        groupedPriorities.set(key, [])
      }
      groupedPriorities.get(key)?.push(priority)
    }

    // Find duplicates - keep the first (oldest) one, mark the rest as duplicates
    const duplicates: any[] = []
    const kept: any[] = []

    groupedPriorities.forEach((group, key) => {
      if (group.length > 1) {
        console.log(`🔄 Found ${group.length} duplicates for: ${key}`)
        // Keep the first one (oldest by created_at)
        kept.push(group[0])
        // Mark the rest as duplicates
        duplicates.push(...group.slice(1))
      } else {
        kept.push(group[0])
      }
    })

    if (duplicates.length === 0) {
      console.log('✅ No duplicate priorities found')
      return NextResponse.json({ message: 'No duplicate priorities found' }, { status: 200 })
    }

    console.log(`🗑️ Removing ${duplicates.length} duplicate priorities...`)

    // Soft delete the duplicates
    const duplicateIds = duplicates.map((d) => d.id)
    const { error: deleteError } = await supabase
      .from('priorities')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in('id', duplicateIds)

    if (deleteError) {
      console.error('❌ Error removing duplicates:', deleteError)
      return NextResponse.json({ error: 'Failed to remove duplicate priorities' }, { status: 500 })
    }

    console.log(`✅ Successfully removed ${duplicates.length} duplicate priorities`)
    console.log(
      'Kept priorities:',
      kept.map((k) => ({ id: k.id, title: k.title }))
    )
    console.log(
      'Removed duplicates:',
      duplicates.map((d) => ({ id: d.id, title: d.title }))
    )

    return NextResponse.json(
      {
        message: `Successfully removed ${duplicates.length} duplicate priorities`,
        removedCount: duplicates.length,
        keptCount: kept.length,
        duplicates: duplicates.map((d) => ({
          id: d.id,
          title: d.title,
          priority_type: d.priority_type,
        })),
        kept: kept.map((k) => ({
          id: k.id,
          title: k.title,
          priority_type: k.priority_type,
        })),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('💥 Unexpected error in clean-duplicates-now API:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
