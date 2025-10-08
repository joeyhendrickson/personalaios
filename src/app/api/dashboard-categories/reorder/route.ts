import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const reorderSchema = z.object({
  categories: z
    .array(
      z.object({
        id: z.string().uuid(),
        sort_order: z.number().int().min(0),
      })
    )
    .min(1, 'At least one category is required'),
})

// POST /api/dashboard-categories/reorder - Reorder categories
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
    const validatedData = reorderSchema.parse(body)

    // Update each category's sort order
    const updatePromises = validatedData.categories.map(({ id, sort_order }) =>
      supabase
        .from('dashboard_categories')
        .update({ sort_order })
        .eq('id', id)
        .eq('user_id', user.id)
    )

    const results = await Promise.all(updatePromises)

    // Check for any errors
    const errors = results.filter((result) => result.error)
    if (errors.length > 0) {
      console.error('Error reordering categories:', errors)
      return NextResponse.json({ error: 'Failed to reorder categories' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 })
    }
    console.error('Error in dashboard categories reorder:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
