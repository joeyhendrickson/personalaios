import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Fetch user's saved Dream Catcher sessions
    const { data: sessions, error: fetchError } = await supabase
      .from('dream_catcher_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching saved sessions:', fetchError)

      // If table doesn't exist, return empty array
      if (fetchError.code === '42P01') {
        return NextResponse.json({ sessions: [] })
      }

      return NextResponse.json({ error: 'Failed to fetch saved sessions' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      sessions: sessions || [],
    })
  } catch (error) {
    console.error('Error in saved sessions API:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch saved sessions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
