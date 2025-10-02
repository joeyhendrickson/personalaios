import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/points - Get points summary for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting points calculation for user:', user.id)

    // Get today's date (UTC)
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // Get today's points (last 24 hours)
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    console.log('Querying points from:', yesterday.toISOString(), 'to:', today.toISOString())

    const { data: todayPoints, error: todayPointsError } = await supabase
      .from('points_ledger')
      .select('points, created_at')
      .eq('user_id', user.id)
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })

    if (todayPointsError) {
      console.error('Today points query error:', todayPointsError)
      return NextResponse.json(
        { error: 'Database error', details: todayPointsError.message },
        { status: 500 }
      )
    }

    const dailyPoints = todayPoints?.reduce((sum, entry) => sum + (entry.points || 0), 0) || 0

    // Get weekly points (last 7 days)
    const weekAgo = new Date(today)
    weekAgo.setDate(today.getDate() - 7)

    const { data: weeklyPoints, error: weeklyPointsError } = await supabase
      .from('points_ledger')
      .select('points, created_at')
      .eq('user_id', user.id)
      .gte('created_at', weekAgo.toISOString())
      .order('created_at', { ascending: false })

    if (weeklyPointsError) {
      console.error('Weekly points query error:', weeklyPointsError)
      return NextResponse.json(
        { error: 'Database error', details: weeklyPointsError.message },
        { status: 500 }
      )
    }

    const weeklyPointsTotal =
      weeklyPoints?.reduce((sum, entry) => sum + (entry.points || 0), 0) || 0

    // Create daily breakdown for the last 7 days
    const dailyBreakdown = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      // Calculate points for this day
      const dayPoints =
        weeklyPoints
          ?.filter((entry) => entry.created_at.startsWith(dateStr))
          .reduce((sum, entry) => sum + (entry.points || 0), 0) || 0

      dailyBreakdown.push({
        date: dateStr,
        points: dayPoints,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      })
    }

    console.log('Points calculation complete:', {
      dailyPoints,
      weeklyPointsTotal,
      todayPointsCount: todayPoints?.length || 0,
      weeklyPointsCount: weeklyPoints?.length || 0,
    })

    return NextResponse.json({
      dailyPoints,
      weeklyPoints: weeklyPointsTotal,
      today: todayStr,
      weekStart: dailyBreakdown[0]?.date || todayStr,
      weekEnd: dailyBreakdown[6]?.date || todayStr,
      dailyBreakdown: dailyBreakdown,
    })
  } catch (error) {
    console.error('Error fetching points:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
