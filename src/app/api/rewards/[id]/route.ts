import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/rewards/[id] - Delete a user reward
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

    const { id: userRewardId } = await params

    // Verify the user reward belongs to the current user
    const { data: userReward, error: fetchError } = await supabase
      .from('user_rewards')
      .select('*')
      .eq('id', userRewardId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !userReward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 })
    }

    // Delete the user reward
    const { error: deleteError } = await supabase
      .from('user_rewards')
      .delete()
      .eq('id', userRewardId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting user reward:', deleteError)
      return NextResponse.json({ error: 'Failed to delete reward' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in delete user reward:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
