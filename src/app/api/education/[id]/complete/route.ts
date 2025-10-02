import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const completeEducationSchema = z.object({
  notes: z.string().optional(),
})

// POST /api/education/[id]/complete - Mark an education item as completed
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const { notes } = completeEducationSchema.parse(body)

    // First, get the education item to check if it exists and get points
    const { data: educationItem, error: fetchError } = await supabase
      .from('education_items')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (fetchError || !educationItem) {
      if (fetchError?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Education item not found' }, { status: 404 })
      }
      console.error('Error fetching education item:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch education item' }, { status: 500 })
    }

    // Check if already completed
    if (educationItem.status === 'completed') {
      return NextResponse.json({ error: 'Education item is already completed' }, { status: 400 })
    }

    // Add education completion
    const { data: completion, error: completionError } = await supabase
      .from('education_completions')
      .insert({
        user_id: user.id,
        education_item_id: id,
        points_awarded: educationItem.points_value,
        notes: notes || null,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (completionError) {
      console.error('Error completing education item:', completionError)
      return NextResponse.json({ error: 'Failed to complete education item' }, { status: 500 })
    }

    return NextResponse.json({
      completion,
      educationItem,
      message: `Education item completed! +${educationItem.points_value} points earned.`,
    })
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
