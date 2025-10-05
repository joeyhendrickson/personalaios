import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find duplicate priorities (same title, same user, same priority_type)
    const { data: allPriorities, error: fetchError } = await supabase
      .from('priorities')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', 'asc')

    if (fetchError) {
      console.error('Error fetching priorities:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch priorities' }, { status: 500 })
    }

    // Group priorities by title and priority_type
    const groupedPriorities = new Map<string, any[]>()

    allPriorities?.forEach((priority) => {
      const key = `${priority.title}-${priority.priority_type}`
      if (!groupedPriorities.has(key)) {
        groupedPriorities.set(key, [])
      }
      groupedPriorities.get(key)!.push(priority)
    })

    // Find duplicates and keep only the oldest one
    const duplicatesToDelete: string[] = []

    for (const [key, priorities] of groupedPriorities) {
      if (priorities.length > 1) {
        console.log(`Found ${priorities.length} duplicates for: ${key}`)
        // Keep the first one (oldest), delete the rest
        const toDelete = priorities.slice(1)
        toDelete.forEach((priority) => {
          duplicatesToDelete.push(priority.id)
        })
      }
    }

    // Delete duplicates
    if (duplicatesToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('priorities')
        .delete()
        .in('id', duplicatesToDelete)

      if (deleteError) {
        console.error('Error deleting duplicates:', deleteError)
        return NextResponse.json({ error: 'Failed to delete duplicates' }, { status: 500 })
      }

      console.log(`Deleted ${duplicatesToDelete.length} duplicate priorities`)
    }

    return NextResponse.json({
      message: `Cleanup completed. Deleted ${duplicatesToDelete.length} duplicate priorities.`,
      deletedCount: duplicatesToDelete.length,
    })
  } catch (error) {
    console.error('Error in cleanup duplicates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
