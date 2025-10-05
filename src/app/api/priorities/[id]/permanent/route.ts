import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/priorities/[id]/permanent - Permanently delete a priority
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: priorityId } = await params

    // Verify the priority exists, belongs to the user, and is soft deleted
    const { data: existingPriority, error: fetchError } = await supabase
      .from('priorities')
      .select('id, is_deleted')
      .eq('id', priorityId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingPriority) {
      return NextResponse.json({ error: 'Priority not found or access denied' }, { status: 404 })
    }

    if (!existingPriority.is_deleted) {
      return NextResponse.json({ error: 'Priority is not deleted' }, { status: 400 })
    }

    // Permanently delete the priority
    const { error: deleteError } = await supabase
      .from('priorities')
      .delete()
      .eq('id', priorityId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error permanently deleting priority:', deleteError)
      return NextResponse.json({ error: 'Failed to permanently delete priority' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Priority permanently deleted' }, { status: 200 })
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
