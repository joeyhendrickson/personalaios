import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/rewards/partner - Get all active partner rewards
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all active partner rewards
    const { data: partnerRewards, error: partnerRewardsError } = await supabase
      .from('partner_rewards')
      .select('*')
      .eq('is_active', true)
      .order('point_cost')

    if (partnerRewardsError) {
      console.error('Error fetching partner rewards:', partnerRewardsError)
      return NextResponse.json({ error: 'Failed to fetch partner rewards' }, { status: 500 })
    }

    return NextResponse.json({ partnerRewards })
  } catch (error) {
    console.error('Error in partner rewards GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
