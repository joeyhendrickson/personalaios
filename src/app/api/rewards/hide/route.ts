import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Schema for hiding a reward
const hideRewardSchema = z.object({
  rewardId: z.string().uuid(),
})

// POST /api/rewards/hide - Hide a reward from user's view
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
    const validatedData = hideRewardSchema.parse(body)

    // Check if reward is already hidden
    const { data: existing, error: checkError } = await supabase
      .from('hidden_rewards')
      .select('id')
      .eq('user_id', user.id)
      .eq('reward_id', validatedData.rewardId)
      .single()

    if (existing) {
      return NextResponse.json({ message: 'Reward already hidden' }, { status: 200 })
    }

    // Hide the reward
    const { data: hiddenReward, error: hideError } = await supabase
      .from('hidden_rewards')
      .insert({
        user_id: user.id,
        reward_id: validatedData.rewardId,
      })
      .select()
      .single()

    if (hideError) {
      console.error('Error hiding reward:', hideError)
      return NextResponse.json({ error: 'Failed to hide reward' }, { status: 500 })
    }

    return NextResponse.json({ hiddenReward }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Error in rewards hide POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/rewards/hide - Unhide a reward (restore to user's view)
export async function DELETE(request: NextRequest) {
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
    const validatedData = hideRewardSchema.parse(body)

    // Unhide the reward
    const { error: unhideError } = await supabase
      .from('hidden_rewards')
      .delete()
      .eq('user_id', user.id)
      .eq('reward_id', validatedData.rewardId)

    if (unhideError) {
      console.error('Error unhiding reward:', unhideError)
      return NextResponse.json({ error: 'Failed to unhide reward' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Reward unhidden successfully' }, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Error in rewards unhide DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
