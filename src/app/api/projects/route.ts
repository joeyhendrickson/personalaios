import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createProjectsBackendClient } from '@/lib/supabase/projects-backend'
import { z } from 'zod'

const createProjectSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  goal_id: z.string().uuid().optional(),
  category: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z_]+$/, 'Category must contain only lowercase letters and underscores')
    .default('other'),
  target_points: z.number().int().min(0).default(0),
  target_money: z.number().min(0).default(0),
  current_points: z.number().int().min(0).default(0),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  deadline: z.string().optional(),
})

/** Coerce DB/PostgREST values so dashboard filters (`!is_completed`) never mis-classify rows. */
function rowIsCompleted(v: unknown): boolean {
  if (v === true || v === 1) return true
  if (v === false || v === 0 || v === null || v === undefined) return false
  if (typeof v === 'string') {
    const s = v.toLowerCase().trim()
    return s === 'true' || s === 't' || s === '1' || s === 'yes'
  }
  return false
}

const updateProjectSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  goal_id: z.string().uuid().nullable().optional(),
  category: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z_]+$/, 'Category must contain only lowercase letters and underscores')
    .optional(),
  target_points: z.number().int().min(0).optional(),
  target_money: z.number().min(0).optional(),
  current_points: z.number().int().min(0).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  deadline: z.string().optional(),
})

// GET /api/projects — dashboard projects (`projects` table, formerly weekly_goals)
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

    const debug = request.nextUrl.searchParams.get('debug') === '1'

    const { client: projectsDb, usesServiceRole } = await createProjectsBackendClient()

    // All rows in `projects` for this user.
    // Service role avoids RLS hiding rows while still scoped by user.id from verified session.
    let projects: unknown[] | null = null
    let projectsError: { message?: string } | null = null

    const primary = await projectsDb
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('project_sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    projects = primary.data as unknown[] | null
    projectsError = primary.error as { message?: string } | null

    // If the sort-order migration hasn't been applied yet, fall back gracefully.
    if (projectsError?.message?.toLowerCase().includes('project_sort_order')) {
      const fallback = await projectsDb
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      projects = fallback.data as unknown[] | null
      projectsError = fallback.error as { message?: string } | null
    }

    if (projectsError) {
      console.error('Error fetching projects:', projectsError)
      return NextResponse.json(
        {
          error: 'Failed to fetch projects',
          details: debug ? projectsError : undefined,
        },
        { status: 500 }
      )
    }

    const rawList = (projects || []) as Record<string, unknown>[]
    const normalizedProjects = rawList.map((row) => ({
      ...row,
      is_completed: rowIsCompleted(row.is_completed),
    }))

    return NextResponse.json(
      debug
        ? {
            projects: normalizedProjects,
            debug: {
              user_id: user.id,
              count: normalizedProjects.length,
              projects_query: usesServiceRole ? 'service_role' : 'anon_jwt_session',
              note:
                !usesServiceRole && normalizedProjects.length === 0
                  ? 'SUPABASE_SERVICE_ROLE_KEY may be unset; listing uses JWT+RLS. Set service role so Projects match the `projects` table in the dashboard.'
                  : undefined,
            },
          }
        : { projects: normalizedProjects },
      { status: 200 }
    )
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

// POST /api/projects — create a dashboard project (`projects`)
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

    const { data: minSortRow } = await supabase
      .from('projects')
      .select('project_sort_order')
      .eq('user_id', user.id)
      .order('project_sort_order', { ascending: true })
      .limit(1)
      .maybeSingle()

    const nextProjectSort =
      minSortRow?.project_sort_order !== undefined && minSortRow.project_sort_order !== null
        ? (minSortRow.project_sort_order as number) - 1
        : 0

    // Create project with current week
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        week_id: currentWeek.id,
        project_sort_order: nextProjectSort,
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
