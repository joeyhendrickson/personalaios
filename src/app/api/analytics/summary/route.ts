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

    console.log('Fetching analytics for user:', user.id)

    // Fetch total points
    const { data: pointsData } = await supabase
      .from('points_ledger')
      .select('points, created_at')
      .eq('user_id', user.id)

    const totalPoints = pointsData?.reduce((sum, entry) => sum + entry.points, 0) || 0

    // Calculate average points per day
    const oldestPoint = pointsData?.[pointsData.length - 1]?.created_at
    const daysSinceStart = oldestPoint
      ? Math.max(1, Math.ceil((Date.now() - new Date(oldestPoint).getTime()) / (1000 * 60 * 60 * 24)))
      : 1
    const averagePointsPerDay = totalPoints / daysSinceStart

    // Fetch tasks
    const { data: allTasks } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('user_id', user.id)

    const completedTasks = allTasks?.filter((t) => t.status === 'completed').length || 0
    const totalTasks = allTasks?.length || 0
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

    console.log('Tasks:', { completed: completedTasks, total: totalTasks, rate: taskCompletionRate })

    // Fetch projects (stored in weekly_goals table)
    const { data: allProjects } = await supabase
      .from('weekly_goals')
      .select('id, is_completed')
      .eq('user_id', user.id)

    const completedProjects = allProjects?.filter((p) => p.is_completed).length || 0
    const activeProjects = allProjects?.filter((p) => !p.is_completed).length || 0
    const totalProjects = allProjects?.length || 0
    const projectCompletionRate = totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0

    // Fetch habits - use habit_completions table
    const { data: habitCompletions } = await supabase
      .from('habit_completions')
      .select('id, habit_id')
      .eq('user_id', user.id)

    const completedHabits = habitCompletions?.length || 0

    // Get total possible habit completions (habits * days active)
    const { data: allHabits } = await supabase
      .from('daily_habits')
      .select('id, created_at')
      .eq('user_id', user.id)

    // Calculate expected completions (habits * days since oldest habit)
    const oldestHabit = allHabits?.[allHabits.length - 1]?.created_at
    const daysSinceOldestHabit = oldestHabit
      ? Math.max(1, Math.ceil((Date.now() - new Date(oldestHabit).getTime()) / (1000 * 60 * 60 * 24)))
      : 1
    const expectedHabitCompletions = (allHabits?.length || 0) * daysSinceOldestHabit
    const habitCompletionRate = expectedHabitCompletions > 0 ? (completedHabits / expectedHabitCompletions) * 100 : 0

    console.log('Habits:', { 
      completed: completedHabits, 
      expected: expectedHabitCompletions, 
      rate: habitCompletionRate,
      totalHabits: allHabits?.length || 0,
      daysSince: daysSinceOldestHabit
    })

    // Fetch category breakdown
    const { data: projectsWithCategories } = await supabase
      .from('weekly_goals')
      .select('category, current_points, target_points')
      .eq('user_id', user.id)

    const { data: tasksWithCategories } = await supabase
      .from('tasks')
      .select('category, points_value, status')
      .eq('user_id', user.id)

    const categoryMap: Record<string, number> = {}
    
    projectsWithCategories?.forEach((project) => {
      const category = project.category || 'Other'
      categoryMap[category] = (categoryMap[category] || 0) + (project.current_points || 0)
    })

    tasksWithCategories?.forEach((task) => {
      if (task.status === 'completed') {
        const category = task.category || 'Other'
        categoryMap[category] = (categoryMap[category] || 0) + (task.points_value || 0)
      }
    })

    const totalCategoryPoints = Object.values(categoryMap).reduce((sum, points) => sum + points, 0)
    const categoryBreakdown = Object.entries(categoryMap)
      .map(([category, points]) => ({
        category,
        points,
        percentage: totalCategoryPoints > 0 ? (points / totalCategoryPoints) * 100 : 0,
      }))
      .sort((a, b) => b.points - a.points)

    // Fetch recent accomplishments
    const { data: accomplishments } = await supabase
      .from('accomplishments')
      .select('title, points, created_at, accomplishment_type')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    const recentAccomplishments =
      accomplishments?.map((a) => ({
        title: a.title,
        points: a.points,
        date: a.created_at,
        type: a.accomplishment_type || 'General',
      })) || []

    // Fetch weekly progress (last 8 weeks)
    const { data: weeks } = await supabase
      .from('weeks')
      .select('week_start, week_end')
      .eq('user_id', user.id)
      .order('week_start', { ascending: false })
      .limit(8)

    const weeklyProgress = await Promise.all(
      (weeks || []).map(async (week) => {
        // Get points for this week
        const { data: weekPoints } = await supabase
          .from('points_ledger')
          .select('points')
          .eq('user_id', user.id)
          .gte('created_at', week.week_start)
          .lte('created_at', week.week_end)

        const points = weekPoints?.reduce((sum, p) => sum + p.points, 0) || 0

        // Get tasks completed this week
        const { data: weekTasks } = await supabase
          .from('tasks')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('updated_at', week.week_start)
          .lte('updated_at', week.week_end)

        return {
          week: new Date(week.week_start).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          points,
          tasksCompleted: weekTasks?.length || 0,
        }
      })
    )

    const result = {
      totalPoints,
      completedTasks,
      completedProjects,
      completedHabits,
      activeProjects,
      habitCompletionRate,
      taskCompletionRate,
      projectCompletionRate,
      averagePointsPerDay,
      streakDays: 0, // TODO: Calculate streak
      categoryBreakdown,
      recentAccomplishments,
      weeklyProgress: weeklyProgress.reverse(),
    }

    console.log('Analytics summary:', result)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

