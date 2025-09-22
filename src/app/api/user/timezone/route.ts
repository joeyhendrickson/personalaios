import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const timezoneSchema = z.object({
  timezone: z.string().min(1).max(50),
})

// GET /api/user/timezone - Get user's timezone preference
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

    // Get user's timezone preference
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('timezone')
      .eq('user_id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Error fetching user timezone:', profileError)
      return NextResponse.json({ error: 'Failed to fetch timezone' }, { status: 500 })
    }

    return NextResponse.json(
      {
        timezone: profile?.timezone || 'America/New_York',
      },
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

// PUT /api/user/timezone - Update user's timezone preference
export async function PUT(request: NextRequest) {
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
    const { timezone } = timezoneSchema.parse(body)

    // Upsert user's timezone preference
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        timezone: timezone,
        updated_at: new Date().toISOString(),
      })
      .select('timezone')
      .single()

    if (profileError) {
      console.error('Error updating user timezone:', profileError)
      return NextResponse.json({ error: 'Failed to update timezone' }, { status: 500 })
    }

    return NextResponse.json(
      {
        timezone: profile.timezone,
        message: 'Timezone updated successfully',
      },
      { status: 200 }
    )
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
