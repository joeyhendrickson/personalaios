import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Schema for adding a reward to user
const addRewardSchema = z.object({
  reward_id: z.string().uuid('Invalid reward ID'),
})

// POST /api/rewards/add-to-user - Add a default reward to user's personal rewards
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
    const validatedData = addRewardSchema.parse(body)

    // Check if user already has this reward
    const { data: existingReward } = await supabase
      .from('user_rewards')
      .select('id')
      .eq('user_id', user.id)
      .eq('reward_id', validatedData.reward_id)
      .single()

    if (existingReward) {
      return NextResponse.json({ error: 'Reward already added to your rewards' }, { status: 400 })
    }

    // Add the reward to user's personal rewards
    const { data: userReward, error: userRewardError } = await supabase
      .from('user_rewards')
      .insert({
        user_id: user.id,
        reward_id: validatedData.reward_id,
        is_custom: false,
        is_unlocked: true,
        is_redeemed: false,
      })
      .select()
      .single()

    if (userRewardError) {
      console.error('Error adding reward to user:', userRewardError)
      return NextResponse.json({ error: 'Failed to add reward to user' }, { status: 500 })
    }

    return NextResponse.json({ userReward }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error in add-to-user POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
