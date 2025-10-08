import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Schema for updating a reward
const updateRewardSchema = z.object({
  rewardId: z.string().uuid(),
  name: z.string().min(1, 'Reward name is required').max(200, 'Name too long').optional(),
  description: z.string().optional(),
  point_cost: z.number().int().min(500, 'Point cost must be at least 500').optional(),
})

// PUT /api/rewards/update - Update a reward (only custom rewards created by the user)
export async function PUT(request: NextRequest) {
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
    const validatedData = updateRewardSchema.parse(body)

    // First, check if the reward exists and is owned by the user
    const { data: existingReward, error: fetchError } = await supabase
      .from('rewards')
      .select('*')
      .eq('id', validatedData.rewardId)
      .single()

    if (fetchError || !existingReward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 })
    }

    // Only allow updating custom rewards created by the user
    if (!existingReward.is_custom || existingReward.created_by !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own custom rewards' },
        { status: 403 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.point_cost !== undefined) updateData.point_cost = validatedData.point_cost

    // Update the reward
    const { data: updatedReward, error: updateError } = await supabase
      .from('rewards')
      .update(updateData)
      .eq('id', validatedData.rewardId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating reward:', updateError)
      return NextResponse.json({ error: 'Failed to update reward' }, { status: 500 })
    }

    return NextResponse.json({ reward: updatedReward }, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error in rewards update PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
