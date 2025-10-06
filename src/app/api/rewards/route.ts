import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Schema for creating a custom reward
const createRewardSchema = z.object({
  name: z.string().min(1, 'Reward name is required').max(200, 'Name too long'),
  description: z.string().optional(),
  point_cost: z.number().int().min(1, 'Point cost must be at least 1'),
  category_id: z.string().uuid().optional(),
})

// GET /api/rewards - Get all available rewards and user's personal rewards
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

    // Get all reward categories
    const { data: categories, error: categoriesError } = await supabase
      .from('reward_categories')
      .select('*')
      .order('name')

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    // Get all default rewards
    const { data: defaultRewards, error: defaultRewardsError } = await supabase
      .from('rewards')
      .select(
        `
        *,
        reward_categories (
          id,
          name,
          icon,
          color
        )
      `
      )
      .eq('is_active', true)
      .eq('is_custom', false)
      .order('point_cost')

    if (defaultRewardsError) {
      console.error('Error fetching default rewards:', defaultRewardsError)
      return NextResponse.json({ error: 'Failed to fetch default rewards' }, { status: 500 })
    }

    // Get user's personal rewards (both default and custom)
    const { data: userRewards, error: userRewardsError } = await supabase
      .from('user_rewards')
      .select(
        `
        *,
        rewards (
          id,
          name,
          description,
          point_cost,
          reward_categories (
            id,
            name,
            icon,
            color
          )
        )
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (userRewardsError) {
      console.error('Error fetching user rewards:', userRewardsError)
      return NextResponse.json({ error: 'Failed to fetch user rewards' }, { status: 500 })
    }

    // Get user's current points balance
    const { data: pointsData } = await supabase
      .from('points_ledger')
      .select('points')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const currentPoints = pointsData?.points || 0

    return NextResponse.json({
      categories,
      defaultRewards,
      userRewards,
      currentPoints,
    })
  } catch (error) {
    console.error('Error in rewards GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/rewards - Create a custom reward
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
    const validatedData = createRewardSchema.parse(body)

    // Create the custom reward
    const { data: reward, error: rewardError } = await supabase
      .from('rewards')
      .insert({
        name: validatedData.name,
        description: validatedData.description,
        point_cost: validatedData.point_cost,
        category_id: validatedData.category_id,
        is_custom: true,
      })
      .select()
      .single()

    if (rewardError) {
      console.error('Error creating reward:', rewardError)
      return NextResponse.json({ error: 'Failed to create reward' }, { status: 500 })
    }

    // Add the reward to user's personal rewards
    const { data: userReward, error: userRewardError } = await supabase
      .from('user_rewards')
      .insert({
        user_id: user.id,
        reward_id: reward.id,
        is_custom: true,
        custom_name: validatedData.name,
        custom_description: validatedData.description,
        custom_point_cost: validatedData.point_cost,
      })
      .select()
      .single()

    if (userRewardError) {
      console.error('Error adding reward to user:', userRewardError)
      return NextResponse.json({ error: 'Failed to add reward to user' }, { status: 500 })
    }

    return NextResponse.json({ reward, userReward }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error in rewards POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
