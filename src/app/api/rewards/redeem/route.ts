import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const redeemRewardSchema = z.object({
  user_reward_id: z.string().uuid(),
  notes: z.string().optional(),
})

// POST /api/rewards/redeem - Redeem a reward
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
    const validatedData = redeemRewardSchema.parse(body)

    // Get the user reward details
    const { data: userReward, error: userRewardError } = await supabase
      .from('user_rewards')
      .select(
        `
        *,
        rewards (
          id,
          name,
          description,
          point_cost
        )
      `
      )
      .eq('id', validatedData.user_reward_id)
      .eq('user_id', user.id)
      .single()

    if (userRewardError || !userReward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 })
    }

    if (userReward.is_redeemed) {
      return NextResponse.json({ error: 'Reward already redeemed' }, { status: 400 })
    }

    if (!userReward.is_unlocked) {
      return NextResponse.json({ error: 'Reward not unlocked yet' }, { status: 400 })
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
    const pointCost = userReward.is_custom
      ? userReward.custom_point_cost
      : userReward.rewards.point_cost

    // Debug logging
    console.log('Points calculation debug:', {
      totalEarnedPoints,
      totalRedeemed,
      currentPoints,
      pointCost,
      userRewardId: validatedData.user_reward_id,
      isCustom: userReward.is_custom,
      customPointCost: userReward.custom_point_cost,
      rewardPointCost: userReward.rewards?.point_cost,
    })

    if (currentPoints < pointCost) {
      return NextResponse.json(
        {
          error: 'Insufficient points',
          currentPoints,
          requiredPoints: pointCost,
          debug: {
            totalEarnedPoints,
            totalRedeemed,
            redeemedRewardsCount: redeemedRewards.length,
          },
        },
        { status: 400 }
      )
    }

    // Calculate new points balance (this will be calculated dynamically)
    const newPointsBalance = currentPoints - pointCost

    // Update user reward as redeemed
    const { data: updatedReward, error: updateRewardError } = await supabase
      .from('user_rewards')
      .update({
        is_redeemed: true,
        redeemed_at: new Date().toISOString(),
      })
      .eq('id', validatedData.user_reward_id)
      .select()
      .single()

    if (updateRewardError) {
      console.error('Error updating reward:', updateRewardError)
      return NextResponse.json({ error: 'Failed to redeem reward' }, { status: 500 })
    }

    console.log('Reward redeemed successfully:', {
      userRewardId: validatedData.user_reward_id,
      updatedReward,
      isRedeemed: updatedReward?.is_redeemed,
    })

    return NextResponse.json({
      success: true,
      newPointsBalance,
      pointsSpent: pointCost,
      rewardName: userReward.is_custom ? userReward.custom_name : userReward.rewards.name,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Error in reward redemption:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
