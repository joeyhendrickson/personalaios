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

    // Get current points balance
    const { data: pointsData, error: pointsError } = await supabase
      .from('points_ledger')
      .select('points')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const currentPoints = pointsData?.points || 0
    const pointCost = userReward.is_custom
      ? userReward.custom_point_cost
      : userReward.rewards.point_cost

    if (currentPoints < pointCost) {
      return NextResponse.json(
        {
          error: 'Insufficient points',
          currentPoints,
          requiredPoints: pointCost,
        },
        { status: 400 }
      )
    }

    // Start a transaction-like operation
    const newPointsBalance = currentPoints - pointCost

    // Update user reward as redeemed
    const { error: updateRewardError } = await supabase
      .from('user_rewards')
      .update({
        is_redeemed: true,
        redeemed_at: new Date().toISOString(),
      })
      .eq('id', validatedData.user_reward_id)

    if (updateRewardError) {
      console.error('Error updating reward:', updateRewardError)
      return NextResponse.json({ error: 'Failed to redeem reward' }, { status: 500 })
    }

    // Create point redemption record
    const { error: redemptionError } = await supabase.from('point_redemptions').insert({
      user_id: user.id,
      user_reward_id: validatedData.user_reward_id,
      points_spent: pointCost,
      points_balance_before: currentPoints,
      points_balance_after: newPointsBalance,
      notes: validatedData.notes,
    })

    if (redemptionError) {
      console.error('Error creating redemption record:', redemptionError)
      return NextResponse.json({ error: 'Failed to record redemption' }, { status: 500 })
    }

    // Update points ledger
    const { error: pointsUpdateError } = await supabase.from('points_ledger').insert({
      user_id: user.id,
      points: newPointsBalance,
      source: 'reward_redemption',
      description: `Redeemed reward: ${userReward.is_custom ? userReward.custom_name : userReward.rewards.name}`,
    })

    if (pointsUpdateError) {
      console.error('Error updating points:', pointsUpdateError)
      return NextResponse.json({ error: 'Failed to update points' }, { status: 500 })
    }

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
