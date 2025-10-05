import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateProgressSchema = z.object({
  progress_percentage: z.number().min(0).max(100),
})

// PATCH /api/goals/[id]/progress - Update goal progress and award points
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: goalId } = await params
    const body = await request.json()
    const { progress_percentage } = updateProgressSchema.parse(body)

    // Get the current goal to calculate points
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('id, title, target_value, current_value, user_id')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .single()

    if (goalError || !goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Calculate progress based on target value
    const targetValue = goal.target_value || 0
    const previousProgress = goal.current_value || 0
    const newProgress = Math.round((progress_percentage / 100) * targetValue)
    const progressChange = newProgress - previousProgress

    // Check if goal should be marked as completed (100% progress)
    const isCompleted = progress_percentage >= 100

    // Update the goal's current progress
    const { error: updateError } = await supabase
      .from('goals')
      .update({
        current_value: newProgress,
        status: isCompleted ? 'completed' : 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', goalId)

    if (updateError) {
      console.error('Error updating goal progress:', updateError)
      return NextResponse.json({ error: 'Failed to update goal progress' }, { status: 500 })
    }

    // Add progress change to the ledger (positive or negative)
    if (progressChange !== 0) {
      const description =
        progressChange > 0 ? `Progress on "${goal.title}"` : `Progress reduced on "${goal.title}"`

      const { error: pointsError } = await supabase.from('points_ledger').insert({
        user_id: user.id,
        goal_id: goalId,
        points: progressChange, // This can be negative
        description: description,
        created_at: new Date().toISOString(),
      })

      if (pointsError) {
        console.error('Error adding progress to ledger:', pointsError)
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      goal: {
        id: goalId,
        current_value: newProgress,
        progress_percentage,
        progress_change: progressChange,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
