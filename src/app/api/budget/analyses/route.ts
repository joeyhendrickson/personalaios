import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const TABLE_MISSING_HINT =
  'The budget_analyses table is missing. Run migration 086_budget_analyses.sql in Supabase.'

const saveSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  analysis_period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  analysis_period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  analysis: z.record(z.string(), z.unknown()),
  run_summary: z.record(z.string(), z.unknown()).optional().nullable(),
  spending_summary: z.record(z.string(), z.unknown()).optional().nullable(),
})

type BudgetAnalysisInsert = {
  user_id: string
  name: string
  analysis_period_start: string
  analysis_period_end: string
  analysis_data: Record<string, unknown>
}

async function insertBudgetAnalysis(
  supabase: Awaited<ReturnType<typeof createClient>>,
  record: BudgetAnalysisInsert
) {
  let insertRes = await supabase.from('budget_analyses').insert(record).select().single()

  if (insertRes.error) {
    const code = insertRes.error.code
    const message = (insertRes.error.message || '').toLowerCase()

    if (code === '42P01' || message.includes('does not exist')) {
      return { data: null, error: insertRes.error, missingTable: true as const }
    }

    try {
      const { createAdminClient } = await import('@/lib/supabaseAdmin')
      const admin = createAdminClient()
      insertRes = await admin.from('budget_analyses').insert(record).select().single()
    } catch (adminErr) {
      console.error('[budget/analyses] admin insert fallback failed:', adminErr)
    }
  }

  return {
    data: insertRes.data,
    error: insertRes.error,
    missingTable: false as const,
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('budget_analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, analyses: [] })
      }
      return NextResponse.json(
        { error: 'Failed to load saved analyses', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, analyses: data || [] })
  } catch (error) {
    console.error('[budget/analyses] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    const body = await request.json().catch(() => ({}))
    const validated = saveSchema.parse(body)

    const defaultName = `Analysis ${validated.analysis_period_start} – ${validated.analysis_period_end}`
    const name = validated.name?.trim() || defaultName

    const record: BudgetAnalysisInsert = {
      user_id: user.id,
      name,
      analysis_period_start: validated.analysis_period_start,
      analysis_period_end: validated.analysis_period_end,
      analysis_data: {
        name,
        analysis: validated.analysis,
        run_summary: validated.run_summary ?? null,
        spending_summary: validated.spending_summary ?? null,
      },
    }

    const insertResult = await insertBudgetAnalysis(supabase, record)

    if (insertResult.error || !insertResult.data) {
      if (insertResult.missingTable) {
        return NextResponse.json(
          { error: 'Failed to save analysis', details: TABLE_MISSING_HINT },
          { status: 500 }
        )
      }
      return NextResponse.json(
        {
          error: 'Failed to save analysis',
          details: insertResult.error?.message || 'Database insert failed',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      analysis: insertResult.data,
      message: 'Analysis saved successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid data format',
          details: error.issues.map((i) => i.message).join('; '),
        },
        { status: 400 }
      )
    }
    console.error('[budget/analyses] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Analysis ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('budget_analyses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Failed to delete analysis', details: TABLE_MISSING_HINT },
          { status: 500 }
        )
      }
      return NextResponse.json({ error: 'Failed to delete analysis' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Analysis deleted successfully' })
  } catch (error) {
    console.error('[budget/analyses] DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
