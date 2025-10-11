import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updatePrioritySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  priority_type: z.enum(['ai_recommended', 'manual', 'fire_auto']).optional(),
  priority_score: z.number().min(0).max(100).optional(),
  manual_order: z.number().int().optional(),
  is_completed: z.boolean().optional(),
})

// PATCH /api/priorities/[id] - Update a specific priority
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: priorityId } = await params
    const body = await request.json()
    const validatedData = updatePrioritySchema.parse(body)

    // Verify the priority exists and belongs to the user
    const { data: existingPriority, error: fetchError } = await supabase
      .from('priorities')
      .select('id')
      .eq('id', priorityId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingPriority) {
      return NextResponse.json({ error: 'Priority not found or access denied' }, { status: 404 })
    }

    // If marking as completed, set completed_at timestamp
    const updateData: any = { ...validatedData }
    if (validatedData.is_completed === true) {
      updateData.completed_at = new Date().toISOString()
    } else if (validatedData.is_completed === false) {
      updateData.completed_at = null
    }

    const { data: priority, error: updateError } = await supabase
      .from('priorities')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', priorityId)
      .eq('user_id', user.id)
      .select('*')
      .single()

    // If priority was completed, also update the underlying goal/task to reflect progress
    if (validatedData.is_completed === true && priority) {
      try {
        // Check if this priority is linked to a task
        if (priority.task_id) {
          console.log(`Updating task ${priority.task_id} to completed`)
          await supabase
            .from('tasks')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', priority.task_id)
            .eq('user_id', user.id)
        }

        // Check if this priority is linked to a project/goal
        if (priority.project_id) {
          console.log(`Updating project ${priority.project_id} progress`)
          // Get current project to calculate new progress
          const { data: project } = await supabase
            .from('weekly_goals')
            .select('current_points, target_points')
            .eq('id', priority.project_id)
            .eq('user_id', user.id)
            .single()

          if (project) {
            // Add priority points to project progress
            const priorityPoints = priority.priority_score || 0
            const newCurrentPoints = Math.min(
              (project.current_points || 0) + priorityPoints,
              project.target_points || 100
            )

            await supabase
              .from('weekly_goals')
              .update({
                current_points: newCurrentPoints,
                updated_at: new Date().toISOString(),
              })
              .eq('id', priority.project_id)
              .eq('user_id', user.id)
          }
        }
      } catch (error) {
        console.error('Error updating underlying goal/task:', error)
        // Don't fail the priority update if the goal/task update fails
      }
    }

    if (updateError) {
      console.error('Error updating priority:', updateError)
      return NextResponse.json({ error: 'Failed to update priority' }, { status: 500 })
    }

    return NextResponse.json({ priority }, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: error.issues,
        },
        { status: 400 }
      )
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

// DELETE /api/priorities/[id] - Delete a specific priority
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: priorityId } = await params

    // Verify the priority exists and belongs to the user
    const { data: existingPriority, error: fetchError } = await supabase
      .from('priorities')
      .select('id')
      .eq('id', priorityId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingPriority) {
      return NextResponse.json({ error: 'Priority not found or access denied' }, { status: 404 })
    }

    // Soft delete the priority instead of hard delete
    const { data: updateResult, error: deleteError } = await supabase
      .from('priorities')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', priorityId)
      .eq('user_id', user.id)
      .select()

    if (deleteError) {
      console.error('Error deleting priority:', deleteError)
      return NextResponse.json({ error: 'Failed to delete priority' }, { status: 500 })
    }

    if (!updateResult || updateResult.length === 0) {
      console.error('No rows were updated during soft delete')
      return NextResponse.json({ error: 'Priority not found or already deleted' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Priority moved to trash successfully' }, { status: 200 })
  } catch (error) {
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
