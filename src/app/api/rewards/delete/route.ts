import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Schema for deleting a reward
const deleteRewardSchema = z.object({
  rewardId: z.string().uuid(),
})

// DELETE /api/rewards/delete - Delete a custom reward (only custom rewards created by the user)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = deleteRewardSchema.parse(body)

    // First, check if the reward exists and is owned by the user
    const { data: existingReward, error: fetchError } = await supabase
      .from('rewards')
      .select('*')
      .eq('id', validatedData.rewardId)
      .single()

    if (fetchError || !existingReward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 })
    }

    // Only allow deleting custom rewards created by the user
    if (!existingReward.is_custom || existingReward.created_by !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own custom rewards' },
        { status: 403 }
      )
    }

    // Delete the reward
    const { error: deleteError } = await supabase
      .from('rewards')
      .delete()
      .eq('id', validatedData.rewardId)

    if (deleteError) {
      console.error('Error deleting reward:', deleteError)
      return NextResponse.json({ error: 'Failed to delete reward' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Reward deleted successfully' }, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error in rewards delete:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
