import { createClient } from '@/lib/supabase/server'
import { createWeeklyGoalsBackendClient } from '@/lib/supabase/weekly-goals-backend'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const bodySchema = z.object({
  projectOrders: z.array(
    z.object({
      id: z.string().uuid(),
      project_sort_order: z.number().int().min(0),
    })
  ),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = bodySchema.parse(await request.json())
    const { projectOrders } = body

    const { client: projectsDb } = await createWeeklyGoalsBackendClient()

    const ids = projectOrders.map((p) => p.id)
    const { data: rows, error: fetchError } = await projectsDb
      .from('weekly_goals')
      .select('id')
      .eq('user_id', user.id)
      .in('id', ids)

    if (fetchError) {
      console.error('Error validating projects:', fetchError)
      return NextResponse.json({ error: 'Failed to validate projects' }, { status: 500 })
    }

    const allowed = new Set((rows ?? []).map((r) => r.id))
    const invalid = ids.filter((id) => !allowed.has(id))
    if (invalid.length > 0) {
      return NextResponse.json({ error: 'Invalid project ids' }, { status: 403 })
    }

    // Sequential updates: parallel Promise.all on PostgREST builders can mis-fire; verify each row.
    for (const item of projectOrders) {
      const { data, error } = await projectsDb
        .from('weekly_goals')
        .update({ project_sort_order: item.project_sort_order })
        .eq('id', item.id)
        .eq('user_id', user.id)
        .select('id')
        .maybeSingle()

      if (error) {
        console.error('Project reorder update failed:', error)
        const missingColumn =
          error.code === '42703' ||
          (error.message?.toLowerCase().includes('project_sort_order') ?? false)
        return NextResponse.json(
          {
            error: 'Failed to update order',
            details: error.message,
            code: error.code,
            hint: missingColumn
              ? 'Database may be missing column weekly_goals.project_sort_order. Apply migration 041_weekly_goals_project_sort_order.sql in Supabase.'
              : undefined,
          },
          { status: 500 }
        )
      }

      if (data == null) {
        return NextResponse.json(
          {
            error: 'Failed to update order',
            details: `No row updated for project ${item.id}. Try refreshing the page.`,
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 })
    }
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
