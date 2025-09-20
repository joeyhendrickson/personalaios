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

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const timezone = url.searchParams.get('timezone') || 'America/New_York'

    // Fetch all points ledger entries for the user
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
          category,
          status
        )
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (pointsError) {
      console.error('Error fetching points history:', pointsError)
      return NextResponse.json({ error: 'Failed to fetch points history' }, { status: 500 })
    }

    // Transform the data into a unified history format
    const history =
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
            task: isTaskCompletion
              ? {
                  title: (entry as any).tasks.title,
                  category: (entry as any).tasks.category,
                  status: (entry as any).tasks.status,
                }
              : null,
            goal: isGoalProgress
              ? {
                  title: (entry as any).weekly_goals.title,
                  category: (entry as any).weekly_goals.category,
                }
              : null,
          },
        }
      }) || []

    return NextResponse.json({ history }, { status: 200 })
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
