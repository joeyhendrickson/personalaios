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

    const updates = projectOrders.map((item) =>
      projectsDb
        .from('weekly_goals')
        .update({ project_sort_order: item.project_sort_order })
        .eq('id', item.id)
        .eq('user_id', user.id)
    )

    const results = await Promise.all(updates)
    const errors = results.filter((r) => r.error)
    if (errors.length > 0) {
      console.error('Project reorder errors:', errors)
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
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
