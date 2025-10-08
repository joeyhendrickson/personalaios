import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Get recent celebrations involving the user or from users they might know
    const { data: celebrations, error } = await supabase
      .from('habit_master_celebrations')
      .select(
        `
        *,
        celebrator:user_profiles!habit_master_celebrations_celebrator_user_id_fkey(full_name),
        celebrated:user_profiles!habit_master_celebrations_celebrated_user_id_fkey(full_name),
        habit:habit_master_habits(title)
      `
      )
      .or(`celebrated_user_id.eq.${user.id},celebrator_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching celebrations:', error)
      return NextResponse.json({ error: 'Failed to fetch celebrations' }, { status: 500 })
    }

    // Transform the data to include user names
    const transformedCelebrations = celebrations.map((celebration) => ({
      id: celebration.id,
      celebrator_name: celebration.celebrator?.full_name || 'Anonymous User',
      celebrated_user_name: celebration.celebrated?.full_name || 'Anonymous User',
      habit_title: celebration.habit?.title || 'Habit',
      celebration_type: celebration.celebration_type,
      message: celebration.message,
      created_at: celebration.created_at,
    }))

    return NextResponse.json(transformedCelebrations)
  } catch (error) {
    console.error('Error in celebrations API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
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
    const { celebrated_user_id, habit_id, celebration_type, message } = body

    if (!celebrated_user_id || !habit_id || !celebration_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Don't allow celebrating yourself
    if (celebrated_user_id === user.id) {
      return NextResponse.json({ error: 'Cannot celebrate yourself' }, { status: 400 })
    }

    const { data: celebration, error } = await supabase
      .from('habit_master_celebrations')
      .insert({
        celebrator_user_id: user.id,
        celebrated_user_id,
        habit_id,
        celebration_type,
        message: message || 'Great job!',
        points_awarded: 5,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating celebration:', error)
      return NextResponse.json({ error: 'Failed to create celebration' }, { status: 500 })
    }

    // Award points to the celebrated user
    await supabase.from('points_ledger').insert({
      user_id: celebrated_user_id,
      points: 5,
      description: `Social celebration: ${celebration_type}`,
      category: 'social_recognition',
    })

    return NextResponse.json(celebration)
  } catch (error) {
    console.error('Error in create celebration API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
