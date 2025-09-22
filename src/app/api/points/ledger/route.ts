import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const addPointsSchema = z.object({
  goal_id: z.string().uuid().optional(),
  task_id: z.string().uuid().optional(),
  points: z.number().min(0),
  description: z.string().min(1),
})

// POST /api/points/ledger - Add points to the ledger
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const validatedData = addPointsSchema.parse(body)

    // Ensure at least one of goal_id or task_id is provided
    if (!validatedData.goal_id && !validatedData.task_id) {
      return NextResponse.json(
        { error: 'Either goal_id or task_id must be provided' },
        { status: 400 }
      )
    }

    // Add points to the ledger
    const { data: ledgerEntry, error: ledgerError } = await supabase
      .from('points_ledger')
      .insert({
        user_id: user.id,
        goal_id: validatedData.goal_id,
        task_id: validatedData.task_id,
        points: validatedData.points,
        description: validatedData.description,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (ledgerError) {
      console.error('Error adding points to ledger:', ledgerError)
      return NextResponse.json({ error: 'Failed to add points to ledger' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      ledgerEntry,
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
