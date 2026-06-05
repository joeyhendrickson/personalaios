import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALL_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

type Preferences = {
  start_hour: number
  end_hour: number
  days: string[]
}

const DEFAULTS: Preferences = { start_hour: 5, end_hour: 24, days: ALL_DAYS }

function clampHour(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : parseInt(String(value), 10)
  if (Number.isNaN(n)) return fallback
  return Math.max(0, Math.min(24, n))
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('calendar_preferences')
      .select('start_hour, end_hour, days')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error && error.code !== '42P01') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ preferences: data ?? DEFAULTS })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load preferences' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const start_hour = clampHour(body.start_hour, DEFAULTS.start_hour)
    const end_hour = clampHour(body.end_hour, DEFAULTS.end_hour)
    const days = Array.isArray(body.days)
      ? body.days.filter((d: unknown): d is string => ALL_DAYS.includes(d as string))
      : DEFAULTS.days

    const { data, error } = await supabase
      .from('calendar_preferences')
      .upsert(
        {
          user_id: user.id,
          start_hour,
          end_hour: end_hour > start_hour ? end_hour : start_hour + 1,
          days: days.length ? days : DEFAULTS.days,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select('start_hour, end_hour, days')
      .single()

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          {
            error: 'Table not found',
            details: 'Run migration 065_create_calendar_integration.sql',
          },
          { status: 500 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, preferences: data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save preferences' },
      { status: 500 }
    )
  }
}
