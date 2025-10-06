import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createMilestoneSchema = z.object({
  milestone_name: z.string().min(1, 'Milestone name is required').max(200, 'Name too long'),
  description: z.string().optional(),
  target_points: z.number().int().min(1, 'Target points must be at least 1'),
  reward_unlocked_id: z.string().uuid().optional(),
})

// GET /api/rewards/milestones - Get user's milestones
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's milestones
    const { data: milestones, error: milestonesError } = await supabase
      .from('user_milestones')
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
      .eq('user_id', user.id)
      .order('target_points')

    if (milestonesError) {
      console.error('Error fetching milestones:', milestonesError)
      return NextResponse.json({ error: 'Failed to fetch milestones' }, { status: 500 })
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

    // Check which milestones should be achieved
    const updatedMilestones = milestones.map((milestone) => {
      const shouldBeAchieved = currentPoints >= milestone.target_points && !milestone.is_achieved
      return {
        ...milestone,
        shouldBeAchieved,
        progress: Math.min((currentPoints / milestone.target_points) * 100, 100),
      }
    })

    return NextResponse.json({
      milestones: updatedMilestones,
      currentPoints,
    })
  } catch (error) {
    console.error('Error in milestones GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/rewards/milestones - Create a custom milestone
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
    const validatedData = createMilestoneSchema.parse(body)

    // Create the milestone
    const { data: milestone, error: milestoneError } = await supabase
      .from('user_milestones')
      .insert({
        user_id: user.id,
        milestone_name: validatedData.milestone_name,
        description: validatedData.description,
        target_points: validatedData.target_points,
        reward_unlocked_id: validatedData.reward_unlocked_id,
      })
      .select()
      .single()

    if (milestoneError) {
      console.error('Error creating milestone:', milestoneError)
      return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 })
    }

    return NextResponse.json({ milestone }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error in milestones POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/rewards/milestones - Update milestone achievement status
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
    const { milestone_id, is_achieved } = body

    if (!milestone_id || typeof is_achieved !== 'boolean') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    // Update the milestone
    const { data: milestone, error: milestoneError } = await supabase
      .from('user_milestones')
      .update({
        is_achieved,
        achieved_at: is_achieved ? new Date().toISOString() : null,
      })
      .eq('id', milestone_id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (milestoneError) {
      console.error('Error updating milestone:', milestoneError)
      return NextResponse.json({ error: 'Failed to update milestone' }, { status: 500 })
    }

    // If milestone is achieved and has a reward, unlock it
    if (is_achieved && milestone.reward_unlocked_id) {
      const { error: unlockError } = await supabase.from('user_rewards').upsert({
        user_id: user.id,
        reward_id: milestone.reward_unlocked_id,
        is_unlocked: true,
      })

      if (unlockError) {
        console.error('Error unlocking reward:', unlockError)
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({ milestone })
  } catch (error) {
    console.error('Error in milestones PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
