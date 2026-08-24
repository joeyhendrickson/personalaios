import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeRewardsBalance } from '@/lib/rewards/points-balance'
import { z } from 'zod'
import { randomBytes } from 'crypto'

// Schema for redeeming a partner reward
const redeemPartnerRewardSchema = z.object({
  partner_reward_id: z.string().uuid('Invalid partner reward ID'),
})

// POST /api/rewards/redeem-partner - Redeem a partner reward
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
    const validatedData = redeemPartnerRewardSchema.parse(body)

    // Get the partner reward details
    const { data: partnerReward, error: partnerRewardError } = await supabase
      .from('partner_rewards')
      .select('*')
      .eq('id', validatedData.partner_reward_id)
      .eq('is_active', true)
      .single()

    if (partnerRewardError || !partnerReward) {
      return NextResponse.json({ error: 'Partner reward not found or inactive' }, { status: 404 })
    }

    const { data: pointsData } = await supabase
      .from('points_ledger')
      .select('points')
      .eq('user_id', user.id)
      .gt('points', 0)
      .limit(20000)

    const { data: redeemedData } = await supabase
      .from('point_redemptions')
      .select('points_spent')
      .eq('user_id', user.id)

    const { currentPoints } = computeRewardsBalance(
      pointsData,
      (redeemedData || []).map((redemption) => redemption.points_spent)
    )

    // Check if user has enough points
    if (currentPoints < partnerReward.point_cost) {
      return NextResponse.json(
        {
          error: 'Insufficient points',
          required: partnerReward.point_cost,
          available: currentPoints,
        },
        { status: 400 }
      )
    }

    // Generate unique redemption code
    const redemptionCode = `PR-${randomBytes(8).toString('hex').toUpperCase()}`

    // Create redemption record
    const { data: redemption, error: redemptionError } = await supabase
      .from('partner_redemptions')
      .insert({
        user_id: user.id,
        partner_reward_id: validatedData.partner_reward_id,
        points_redeemed: partnerReward.point_cost,
        redemption_code: redemptionCode,
        status: 'redeemed',
      })
      .select()
      .single()

    if (redemptionError) {
      console.error('Error creating redemption:', redemptionError)
      return NextResponse.json({ error: 'Failed to create redemption' }, { status: 500 })
    }

    // Calculate new points balance
    const newPointsBalance = currentPoints - partnerReward.point_cost

    return NextResponse.json({
      redemption,
      redemptionCode,
      newPointsBalance,
      pointsSpent: partnerReward.point_cost,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Error in redeem-partner POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
