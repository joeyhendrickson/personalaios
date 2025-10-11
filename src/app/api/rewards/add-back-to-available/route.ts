import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Schema for adding a reward back to available
const addBackSchema = z.object({
  user_reward_id: z.string().uuid('Invalid user reward ID'),
})

// POST /api/rewards/add-back-to-available - Add a redeemed reward back to available awards
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

    const body = await request.json()
    const validatedData = addBackSchema.parse(body)

    console.log('Add back to available - Request data:', {
      userRewardId: validatedData.user_reward_id,
      userId: user.id,
    })

    // Get the user reward details
    const { data: userReward, error: fetchError } = await supabase
      .from('user_rewards')
      .select('*, rewards(*)')
      .eq('id', validatedData.user_reward_id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !userReward) {
      console.log('User reward not found:', { fetchError, userReward })
      return NextResponse.json({ error: 'User reward not found' }, { status: 404 })
    }

    console.log('Found user reward:', {
      id: userReward.id,
      is_redeemed: userReward.is_redeemed,
      is_unlocked: userReward.is_unlocked,
      reward_id: userReward.reward_id,
      custom_name: userReward.custom_name,
    })

    if (!userReward.is_redeemed) {
      return NextResponse.json({ error: 'Reward is not redeemed' }, { status: 400 })
    }

    // Create a new duplicate entry for the reward (keeping the original redeemed one intact)
    const { data: newUserReward, error: insertError } = await supabase
      .from('user_rewards')
      .insert({
        user_id: user.id,
        reward_id: userReward.reward_id,
        is_custom: userReward.is_custom,
        is_unlocked: true,
        is_redeemed: false,
        custom_name: userReward.custom_name,
        custom_description: userReward.custom_description,
        custom_point_cost: userReward.custom_point_cost,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating new user reward:', insertError)
      return NextResponse.json(
        {
          error: 'Failed to add reward back to available',
          details: insertError.message,
          code: insertError.code,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Reward added back to available awards',
        newUserReward,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Error in add-back-to-available POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
