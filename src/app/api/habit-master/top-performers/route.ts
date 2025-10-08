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

    // Get top performers from leaderboards
    const { data: topPerformers, error } = await supabase
      .from('habit_master_leaderboards')
      .select(`
        *,
        user:user_profiles(full_name),
        category:habit_categories(name)
      `)
      .order('current_streak', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching top performers:', error)
      return NextResponse.json({ error: 'Failed to fetch top performers' }, { status: 500 })
    }

    // Transform the data to include user names
    const transformedPerformers = topPerformers.map(performer => ({
      user_name: performer.user?.full_name || 'Anonymous User',
      total_completions: performer.total_completions,
      current_streak: performer.current_streak,
      category: performer.category?.name || 'General',
      total_points: performer.total_points,
    }))

    return NextResponse.json(transformedPerformers)
  } catch (error) {
    console.error('Error in top performers API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
