import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createPrioritySchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  priority_type: z.enum(['ai_recommended', 'manual', 'fire_auto']),
  priority_score: z.number().min(0).max(100).default(0),
  order_index: z.number().int().optional(),
  is_completed: z.boolean().optional(),
})

const updatePrioritySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  priority_type: z.enum(['ai_recommended', 'manual', 'fire_auto']).optional(),
  priority_score: z.number().min(0).max(100).optional(),
  order_index: z.number().int().optional(),
  is_completed: z.boolean().optional(),
})

// GET /api/priorities - Get all priorities for the current user
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

    const { data: priorities, error: prioritiesError } = await supabase
      .from('priorities')
      .select('*')
      .eq('user_id', user.id)
      .order('order_index', { ascending: true })
      .order('priority_score', { ascending: false })
      .order('created_at', { ascending: false })

    if (prioritiesError) {
      console.error('Error fetching priorities:', prioritiesError)
      return NextResponse.json({ error: 'Failed to fetch priorities' }, { status: 500 })
    }

    return NextResponse.json({ priorities: priorities || [] }, { status: 200 })
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

// POST /api/priorities - Create a new priority
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
    const validatedData = createPrioritySchema.parse(body)

    const { data: priority, error: priorityError } = await supabase
      .from('priorities')
      .insert({
        user_id: user.id,
        ...validatedData,
      })
      .select()
      .single()

    if (priorityError) {
      console.error('Error creating priority:', priorityError)
      return NextResponse.json({ error: 'Failed to create priority' }, { status: 500 })
    }

    return NextResponse.json({ priority }, { status: 201 })
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
