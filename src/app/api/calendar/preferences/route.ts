import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createDefaultWindow,
  normalizePreferences,
  sanitizeWindowsInput,
} from '@/lib/calendar/preferences'

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
      .select('start_hour, end_hour, days, time_windows')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error && error.code !== '42P01') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ preferences: normalizePreferences(data) })
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
    const windows = sanitizeWindowsInput(body.windows ?? body)
    const primary = windows[0] ?? createDefaultWindow()

    const { data, error } = await supabase
      .from('calendar_preferences')
      .upsert(
        {
          user_id: user.id,
          start_hour: primary.start_hour,
          end_hour: primary.end_hour,
          days: primary.days,
          time_windows: windows,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select('start_hour, end_hour, days, time_windows')
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
      if (error.code === '42703') {
        return NextResponse.json(
          {
            error: 'Column not found',
            details: 'Run migration 083_calendar_time_windows.sql',
          },
          { status: 500 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, preferences: normalizePreferences(data) })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save preferences' },
      { status: 500 }
    )
  }
}
