import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createWeekSchema = z.object({
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  week_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

// GET /api/weeks - Get weeks
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    let query = supabase.from('weeks').select('*').order('week_start', { ascending: false })

    if (start && end) {
      query = query.eq('week_start', start).eq('week_end', end)
    }

    const { data: weeks, error } = await query

    if (error) {
      console.error('Error fetching weeks:', error)
      return NextResponse.json({ error: 'Failed to fetch weeks' }, { status: 500 })
    }

    // If looking for specific week, return single week
    if (start && end) {
      return NextResponse.json({ week: weeks[0] || null })
    }

    return NextResponse.json({ weeks })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/weeks - Create a new week
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const validatedData = createWeekSchema.parse(body)

    const { data: week, error } = await supabase
      .from('weeks')
      .insert(validatedData)
      .select()
      .single()

    if (error) {
      console.error('Error creating week:', error)
      return NextResponse.json({ error: 'Failed to create week' }, { status: 500 })
    }

    return NextResponse.json({ week }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
