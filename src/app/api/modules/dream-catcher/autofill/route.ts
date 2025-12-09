import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
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
    const {
      goals,
      vision_statement,
      personality_traits,
      dreams_discovered,
      is_new_user = false,
    } = body

    if (!goals || !Array.isArray(goals) || goals.length === 0) {
      return NextResponse.json({ error: 'Goals are required' }, { status: 400 })
    }

    let goalsAdded = 0
    const errors: string[] = []

    // For existing users, check if they already have goals
    if (!is_new_user) {
      const { data: existingGoals } = await supabase
        .from('goals')
        .select('title')
        .eq('user_id', user.id)

      const existingGoalTitles = new Set(
        (existingGoals || []).map((g) => g.title.toLowerCase().trim())
      )

      // Filter out goals that already exist (by title)
      const newGoals = goals.filter(
        (goal: any) => !existingGoalTitles.has(goal.goal.toLowerCase().trim())
      )

      if (newGoals.length === 0) {
        return NextResponse.json({
          success: true,
          goals_added: 0,
          message: 'All goals already exist in your dashboard',
        })
      }

      // Create goals for existing users (append mode)
      for (const goalData of newGoals) {
        try {
          const { error: goalError } = await supabase.from('goals').insert({
            user_id: user.id,
            title: goalData.goal,
            description: `From Dream Catcher: ${goalData.category} - ${goalData.timeline}`,
            category: goalData.category.toLowerCase().replace(/\s+/g, '_'),
            goal_type: 'personal',
            target_value: null,
            current_value: null,
            priority:
              goalData.priority === 'high'
                ? 'high'
                : goalData.priority === 'medium'
                  ? 'medium'
                  : 'low',
            status: 'in_progress',
            deadline: calculateDeadline(goalData.timeline),
          })

          if (goalError) {
            console.error('Error creating goal:', goalError)
            errors.push(`Failed to create goal: ${goalData.goal}`)
          } else {
            goalsAdded++
          }
        } catch (err) {
          console.error('Error processing goal:', err)
          errors.push(`Error processing goal: ${goalData.goal}`)
        }
      }
    } else {
      // For new users, create all goals (they have empty dashboard)
      for (const goalData of goals) {
        try {
          const { error: goalError } = await supabase.from('goals').insert({
            user_id: user.id,
            title: goalData.goal,
            description: `From Dream Catcher: ${goalData.category} - ${goalData.timeline}`,
            category: goalData.category.toLowerCase().replace(/\s+/g, '_'),
            goal_type: 'personal',
            target_value: null,
            current_value: null,
            priority:
              goalData.priority === 'high'
                ? 'high'
                : goalData.priority === 'medium'
                  ? 'medium'
                  : 'low',
            status: 'in_progress',
            deadline: calculateDeadline(goalData.timeline),
          })

          if (goalError) {
            console.error('Error creating goal:', goalError)
            errors.push(`Failed to create goal: ${goalData.goal}`)
          } else {
            goalsAdded++
          }
        } catch (err) {
          console.error('Error processing goal:', err)
          errors.push(`Error processing goal: ${goalData.goal}`)
        }
      }
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'dream_catcher_autofill',
      description: `Dream Catcher autofill: ${goalsAdded} goals added to dashboard`,
      metadata: {
        goals_added: goalsAdded,
        is_new_user: is_new_user,
        total_goals: goals.length,
      },
    })

    return NextResponse.json({
      success: true,
      goals_added: goalsAdded,
      total_goals: goals.length,
      errors: errors.length > 0 ? errors : undefined,
      message:
        errors.length > 0
          ? `Added ${goalsAdded} goals. Some goals could not be added.`
          : `Successfully added ${goalsAdded} goals to your dashboard!`,
    })
  } catch (error) {
    console.error('Error in autofill Dream Catcher API:', error)
    return NextResponse.json(
      {
        error: 'Failed to autofill dashboard',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

function calculateDeadline(timeline: string): string | null {
  const now = new Date()
  const deadline = new Date()

  if (timeline.includes('1 month') || timeline.includes('1 month')) {
    deadline.setMonth(now.getMonth() + 1)
  } else if (timeline.includes('3 months')) {
    deadline.setMonth(now.getMonth() + 3)
  } else if (timeline.includes('6 months')) {
    deadline.setMonth(now.getMonth() + 6)
  } else if (timeline.includes('1 year')) {
    deadline.setFullYear(now.getFullYear() + 1)
  } else if (timeline.includes('2+ years') || timeline.includes('2 years')) {
    deadline.setFullYear(now.getFullYear() + 2)
  } else {
    // Default to 3 months
    deadline.setMonth(now.getMonth() + 3)
  }

  return deadline.toISOString().split('T')[0]
}
