import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeFears } from '@/lib/fear-catcher/analyze-fears'

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
    const fears = Array.isArray(body?.fears) ? (body.fears as unknown[]).map(String) : []

    if (fears.filter((f) => f.trim().length > 0).length === 0) {
      return NextResponse.json({ error: 'Please add at least one fear.' }, { status: 400 })
    }

    const analysis = await analyzeFears(fears)
    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    console.error('Error in Fear Catcher analyze API:', error)
    return NextResponse.json(
      {
        error: 'Failed to analyze fears',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
