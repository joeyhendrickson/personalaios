import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/projects/strategic-completion-recommendations-simple - Simple version without AI
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

    console.log('Generating simple strategic completion recommendations for user:', user.id)

    // Fetch user's projects (weekly_goals)
    const { data: projects, error: projectsError } = await supabase
      .from('weekly_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (projectsError) {
      console.error('Error fetching projects:', projectsError)
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
    }

    // Fetch user's goals
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (goalsError) {
      console.error('Error fetching goals:', goalsError)
      return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
    }

    // Fetch user's tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    console.log(
      'Data fetched - Projects:',
      projects?.length || 0,
      'Goals:',
      goals?.length || 0,
      'Tasks:',
      tasks?.length || 0
    )

    // Calculate completion metrics
    const completedProjects = (projects || []).filter((p) => p.is_completed).length
    const totalProjects = (projects || []).length
    const completionRate =
      totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0

    const completedTasks = (tasks || []).filter((t) => t.status === 'completed').length
    const totalTasks = (tasks || []).length
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // Generate a simple recommendation based on data
    let recommendation =
      'Focus on completing your current projects to improve your overall completion rate.'
    let focusArea = 'completion acceleration'

    if (completionRate < 50) {
      recommendation =
        'Your project completion rate is below 50%. Consider breaking down large projects into smaller, manageable tasks and focusing on quick wins first.'
      focusArea = 'project breakdown'
    } else if (completionRate < 80) {
      recommendation =
        "You're making good progress! Focus on completing the remaining projects and consider setting clearer deadlines to maintain momentum."
      focusArea = 'momentum maintenance'
    } else {
      recommendation =
        'Excellent completion rate! Consider taking on new challenges or helping others with their projects to continue growing.'
      focusArea = 'growth expansion'
    }

    const currentTime = new Date().toISOString()

    return NextResponse.json(
      {
        recommendation,
        focusArea,
        completionRate,
        taskCompletionRate,
        timestamp: currentTime,
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
