import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createProjectSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z
    .enum([
      'quick_money',
      'save_money',
      'health',
      'network_expansion',
      'business_growth',
      'fires',
      'good_living',
      'big_vision',
      'job',
      'organization',
      'tech_issues',
      'business_launch',
      'future_planning',
      'innovation',
      'productivity',
      'learning',
      'financial',
      'personal',
      'other',
    ])
    .default('other'),
  target_points: z.number().int().min(0).default(0),
  target_money: z.number().min(0).default(0),
  current_points: z.number().int().min(0).default(0),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  deadline: z.string().optional(),
})

const updateProjectSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  category: z
    .enum([
      'quick_money',
      'save_money',
      'health',
      'network_expansion',
      'business_growth',
      'fires',
      'good_living',
      'big_vision',
      'job',
      'organization',
      'tech_issues',
      'business_launch',
      'future_planning',
      'innovation',
      'productivity',
      'learning',
      'financial',
      'personal',
      'other',
    ])
    .optional(),
  target_points: z.number().int().min(0).optional(),
  target_money: z.number().min(0).optional(),
  current_points: z.number().int().min(0).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  deadline: z.string().optional(),
})

// GET /api/projects - Get all projects (weekly_goals) for the current user
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

    // Get all weekly_goals for the user (these are the projects)
    const { data: projects, error: projectsError } = await supabase
      .from('weekly_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (projectsError) {
      console.error('Error fetching projects:', projectsError)
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
    }

    return NextResponse.json({ projects: projects || [] }, { status: 200 })
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

// POST /api/projects - Create a new project (weekly_goal)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('[Projects API] Received request body:', body)

    const validatedData = createProjectSchema.parse(body)
    console.log('[Projects API] Validated data:', validatedData)

    // Get current week - try to find existing week or create one
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format

    // First, try to find an existing week that contains today
    const { data: existingWeeks, error: weekError } = await supabase
      .from('weeks')
      .select('id, week_start, week_end')
      .lte('week_start', today)
      .gte('week_end', today)
      .order('week_start', { ascending: false })
      .limit(1)

    let currentWeek

    if (weekError) {
      console.error('Error fetching weeks:', weekError)
      return NextResponse.json({ error: 'Failed to get current week' }, { status: 500 })
    }

    if (existingWeeks && existingWeeks.length > 0) {
      // Use existing week
      currentWeek = existingWeeks[0]
    } else {
      // Create a new week for the current date
      const startOfWeek = new Date()
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)

      const { data: newWeek, error: createError } = await supabase
        .from('weeks')
        .insert({
          week_start: startOfWeek.toISOString().split('T')[0],
          week_end: endOfWeek.toISOString().split('T')[0],
        })
        .select('id, week_start, week_end')
        .single()

      if (createError || !newWeek) {
        console.error('Error creating new week:', createError)
        return NextResponse.json({ error: 'Failed to create current week' }, { status: 500 })
      }

      currentWeek = newWeek
    }

    // Create project with current week
    const { data: project, error: projectError } = await supabase
      .from('weekly_goals')
      .insert({
        user_id: user.id,
        week_id: currentWeek.id,
        ...validatedData,
      })
      .select()
      .single()

    if (projectError) {
      console.error('Error creating project:', projectError)
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
    }

    return NextResponse.json({ project }, { status: 201 })
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
