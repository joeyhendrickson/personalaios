import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/accomplishments - Get recent accomplishments and full history
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

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const type = url.searchParams.get('type') // 'recent' or 'all'

    // Fetch points ledger entries (goal progress and task completions)
    const { data: pointsEntries, error: pointsError } = await supabase
      .from('points_ledger')
      .select(
        `
        id,
        points,
        description,
        created_at,
        weekly_goal_id,
        task_id,
        weekly_goals!points_ledger_weekly_goal_id_fkey (
          id,
          title,
          category
        ),
        tasks!points_ledger_task_id_fkey (
          id,
          title,
          status
        )
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(type === 'all' ? 1000 : limit)

    if (pointsError) {
      console.error('Error fetching points entries:', pointsError)
      return NextResponse.json({ error: 'Failed to fetch accomplishments' }, { status: 500 })
    }

    // Transform the data into a unified accomplishments format
    const accomplishments =
      pointsEntries?.map((entry) => {
        const isGoalProgress = entry.weekly_goal_id && entry.weekly_goals
        const isTaskCompletion = entry.task_id && entry.tasks

        return {
          id: entry.id,
          type: isGoalProgress ? 'goal_progress' : isTaskCompletion ? 'task_completion' : 'other',
          points: entry.points,
          description: entry.description,
          created_at: entry.created_at,
          details: {
            goal: isGoalProgress
              ? {
                  id: (entry as any).weekly_goals.id,
                  title: (entry as any).weekly_goals.title,
                  category: (entry as any).weekly_goals.category,
                }
              : null,
            task: isTaskCompletion
              ? {
                  id: (entry as any).tasks.id,
                  title: (entry as any).tasks.title,
                  status: (entry as any).tasks.status,
                }
              : null,
          },
        }
      }) || []

    // Calculate summary statistics
    const totalPoints = accomplishments.reduce((sum, acc) => sum + acc.points, 0)
    const todayPoints = accomplishments
      .filter((acc) => {
        const today = new Date()
        const accDate = new Date(acc.created_at)
        return accDate.toDateString() === today.toDateString()
      })
      .reduce((sum, acc) => sum + acc.points, 0)

    const thisWeekPoints = accomplishments
      .filter((acc) => {
        const now = new Date()
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        weekStart.setHours(0, 0, 0, 0)
        return new Date(acc.created_at) >= weekStart
      })
      .reduce((sum, acc) => sum + acc.points, 0)

    return NextResponse.json({
      accomplishments,
      summary: {
        totalPoints,
        todayPoints,
        thisWeekPoints,
        totalAccomplishments: accomplishments.length,
      },
    })
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
