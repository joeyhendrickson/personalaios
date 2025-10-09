import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Schema for updating a user reward
const updateUserRewardSchema = z.object({
  userRewardId: z.string().uuid(),
  custom_name: z.string().min(1, 'Reward name is required').max(200, 'Name too long').optional(),
  custom_description: z.string().optional(),
  custom_point_cost: z.number().int().min(0, 'Point cost cannot be negative').optional(),
})

// PUT /api/rewards/update-user-reward - Update a user's reward customization
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
    const validatedData = updateUserRewardSchema.parse(body)

    // First, check if the user reward exists and is owned by the user
    const { data: existingUserReward, error: fetchError } = await supabase
      .from('user_rewards')
      .select('*')
      .eq('id', validatedData.userRewardId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingUserReward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {
      is_custom: true, // Mark as custom when user edits it
    }
    if (validatedData.custom_name !== undefined) updateData.custom_name = validatedData.custom_name
    if (validatedData.custom_description !== undefined)
      updateData.custom_description = validatedData.custom_description
    if (validatedData.custom_point_cost !== undefined)
      updateData.custom_point_cost = validatedData.custom_point_cost

    // Update the user reward
    const { data: updatedUserReward, error: updateError } = await supabase
      .from('user_rewards')
      .update(updateData)
      .eq('id', validatedData.userRewardId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating user reward:', updateError)
      return NextResponse.json({ error: 'Failed to update reward' }, { status: 500 })
    }

    return NextResponse.json({ userReward: updatedUserReward }, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Error in user rewards update PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
