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

    // Get the reward details to check point cost
    const { data: reward, error: rewardError } = await supabase
      .from('rewards')
      .select('point_cost')
      .eq('id', validatedData.reward_id)
      .single()

    if (rewardError || !reward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 })
    }

    // Get total earned points (sum all positive points from points_ledger)
    const { data: allPointsData, error: pointsError } = await supabase
      .from('points_ledger')
      .select('points')
      .eq('user_id', user.id)

    if (pointsError) {
      console.error('Error fetching points:', pointsError)
      return NextResponse.json({ error: 'Failed to fetch points' }, { status: 500 })
    }

    const totalEarnedPoints =
      allPointsData?.reduce((sum, entry) => sum + (entry.points || 0), 0) || 0

    // Get total points spent on redeemed rewards
    const { data: userRewards, error: userRewardsError } = await supabase
      .from('user_rewards')
      .select('custom_point_cost, rewards(point_cost), is_redeemed')
      .eq('user_id', user.id)

    if (userRewardsError) {
      console.error('Error fetching user rewards:', userRewardsError)
      return NextResponse.json({ error: 'Failed to fetch user rewards' }, { status: 500 })
    }

    const redeemedRewards = userRewards?.filter((ur) => ur.is_redeemed) || []
    const totalRedeemed = redeemedRewards.reduce((sum, userReward) => {
      const reward = Array.isArray(userReward.rewards) ? userReward.rewards[0] : userReward.rewards
      const pointCost = userReward.custom_point_cost || reward?.point_cost || 0
      return sum + pointCost
    }, 0)

    const currentPoints = totalEarnedPoints - totalRedeemed

    // Check if user has enough points
    if (currentPoints < reward.point_cost) {
      return NextResponse.json(
        {
          error: 'Insufficient points',
          currentPoints,
          requiredPoints: reward.point_cost,
          debug: {
            totalEarnedPoints,
            totalRedeemed,
            redeemedRewardsCount: redeemedRewards.length,
          },
        },
        { status: 400 }
      )
    }

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

    // Note: We don't deduct points from user_points table anymore
    // Current points are calculated dynamically based on redeemed rewards
    // The point checking above ensures user has enough points before allowing redemption

    return NextResponse.json(
      {
        userReward,
        message: 'Reward added to your rewards successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Error in add-to-user POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
