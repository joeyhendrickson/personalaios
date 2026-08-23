import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateEducationItemSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  points_value: z.number().min(1).max(10000).optional(),
  cost: z.number().min(0).optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  priority_level: z.number().min(1).max(5).optional(),
  target_date: z.string().optional(),
  is_active: z.boolean().optional(),
})

// PATCH /api/education/[id] - Update an education item
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateEducationItemSchema.parse(body)

    const { data: educationItem, error: educationError } = await supabase
      .from('education_items')
      .update(validatedData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (educationError) {
      console.error('Error updating education item:', educationError)
      return NextResponse.json({ error: 'Failed to update education item' }, { status: 500 })
    }

    return NextResponse.json({ educationItem }, { status: 200 })
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

// DELETE /api/education/[id] - Delete an education item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: existingItem, error: fetchError } = await supabase
      .from('education_items')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchError) {
      console.error('Error finding education item:', fetchError)
      return NextResponse.json({ error: 'Failed to delete education item' }, { status: 500 })
    }

    if (!existingItem) {
      return NextResponse.json({ error: 'Education item not found' }, { status: 404 })
    }

    // Remove completions first so a hard delete is not blocked by FK/RLS cascade.
    const { error: completionsError } = await supabase
      .from('education_completions')
      .delete()
      .eq('education_item_id', id)
      .eq('user_id', user.id)

    if (completionsError) {
      console.error('Error deleting education completions:', completionsError)
    }

    const { data: deletedItem, error: educationError } = await supabase
      .from('education_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle()

    if (educationError) {
      console.error('Error deleting education item:', educationError)
    }

    if (!deletedItem) {
      // Hard delete can no-op under RLS or fail on remaining FKs. Hide the row
      // so GET /api/education (is_active = true) no longer returns it.
      const { data: hiddenItem, error: hideError } = await supabase
        .from('education_items')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', user.id)
        .select('id')
        .maybeSingle()

      if (hideError || !hiddenItem) {
        console.error('Error hiding education item:', hideError)
        return NextResponse.json({ error: 'Failed to delete education item' }, { status: 500 })
      }
    }

    return NextResponse.json({ message: 'Education item deleted successfully' }, { status: 200 })
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
