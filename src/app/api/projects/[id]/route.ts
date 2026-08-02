import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createProjectsBackendClient } from '@/lib/supabase/projects-backend'
import { formatZodIssues, updateProjectSchema } from '@/lib/projects/schemas'
import { z } from 'zod'

function isMissingGoalIdColumnError(message: string | undefined): boolean {
  if (!message) return false
  const lower = message.toLowerCase()
  return lower.includes('goal_id') && (lower.includes('column') || lower.includes('schema cache'))
}

// PATCH /api/projects/[id] - Update a project
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

    const { id: projectId } = await params
    const body = await request.json()
    const validatedData = updateProjectSchema.parse(body)

    const { client: projectsDb } = await createProjectsBackendClient()

    // Verify the project exists and belongs to the user
    const { data: existingProject, error: fetchError } = await projectsDb
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingProject) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    const applyUpdate = async (payload: Record<string, unknown>) =>
      projectsDb
        .from('projects')
        .update(payload)
        .eq('id', projectId)
        .eq('user_id', user.id)
        .select()
        .single()

    let { data: updatedProject, error: updateError } = await applyUpdate(validatedData)

    if (updateError && isMissingGoalIdColumnError(updateError.message)) {
      const { goal_id: _goalId, ...withoutGoalId } = validatedData
      ;({ data: updatedProject, error: updateError } = await applyUpdate(withoutGoalId))
    }

    if (updateError) {
      console.error('Error updating project:', updateError)
      return NextResponse.json(
        {
          error: 'Failed to update project',
          details: updateError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ project: updatedProject }, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: error.issues,
          message: formatZodIssues(error),
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

// DELETE /api/projects/[id] - Delete a project
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

    const { id: projectId } = await params

    const { client: projectsDb } = await createProjectsBackendClient()

    // Verify the project exists and belongs to the user
    const { data: existingProject, error: fetchError } = await projectsDb
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingProject) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    const { error: deleteError } = await projectsDb
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting project:', deleteError)
      return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Project deleted successfully' }, { status: 200 })
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
