import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const importGoalSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z
    .enum([
      'quick_money',
      'save_money', 
      'health',
      'network_expansion',
      'business_growth',
      'fires',
      'good_living',
      'big_vision',
      'job',
      'organization',
      'tech_issues',
      'business_launch',
      'future_planning',
      'innovation',
      'productivity',
      'learning',
      'financial',
      'personal',
      'other'
    ])
    .default('other'),
  target_points: z.number().int().min(0).default(0),
  target_money: z.number().min(0).default(0),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  deadline: z.string().optional(),
})

const importTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  points_value: z.number().int().min(0).default(0),
  money_value: z.number().min(0).default(0),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  estimated_time: z.string().optional(),
})

const importDataSchema = z.object({
  goals: z.array(importGoalSchema),
  tasks: z.array(importTaskSchema),
})

// POST /api/import/goals - Import goals and tasks
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    console.log('Received import request body:', body)
    
    const { goals, tasks } = importDataSchema.parse(body)
    console.log('Parsed goals:', goals)
    console.log('Parsed tasks:', tasks)

    // Create or get current week
    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay()) // Start of week (Sunday)
    
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6) // End of week (Saturday)

    const weekStartStr = weekStart.toISOString().split('T')[0]
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    // Check if week already exists
    let { data: existingWeek } = await supabase
      .from('weeks')
      .select('id')
      .eq('week_start', weekStartStr)
      .eq('week_end', weekEndStr)
      .single()

    let weekId: string

    if (existingWeek) {
      weekId = existingWeek.id
    } else {
      // Create new week
      const { data: newWeek, error: weekError } = await supabase
        .from('weeks')
        .insert({
          week_start: weekStartStr,
          week_end: weekEndStr,
        })
        .select('id')
        .single()

      if (weekError || !newWeek) {
        console.error('Error creating week:', weekError)
        return NextResponse.json({ error: 'Failed to create week' }, { status: 500 })
      }

      weekId = newWeek.id
    }

    const importedGoals = []
    const importedTasks = []

    // Import goals
    for (const goalData of goals) {
      const { data: goal, error: goalError } = await supabase
        .from('weekly_goals')
        .insert({
          week_id: weekId,
          user_id: user.id,
          title: goalData.title,
          description: goalData.description || '',
          category: goalData.category,
          target_points: goalData.target_points,
          target_money: goalData.target_money,
        })
        .select('id, title')
        .single()

      if (goalError) {
        console.error('Error creating goal:', goalError)
        return NextResponse.json({ 
          error: `Failed to import goal: ${goalData.title}`,
          details: goalError.message 
        }, { status: 500 })
      }

      importedGoals.push(goal)
    }

    // Import tasks (associate with first goal if no specific association)
    const firstGoalId = importedGoals[0]?.id
    if (firstGoalId && tasks.length > 0) {
      for (const taskData of tasks) {
        const { data: task, error: taskError } = await supabase
          .from('tasks')
          .insert({
            weekly_goal_id: firstGoalId,
            user_id: user.id,
            title: taskData.title,
            description: taskData.description || '',
            points_value: taskData.points_value,
            money_value: taskData.money_value,
          })
          .select('id, title')
          .single()

        if (taskError) {
          console.error('Error creating task:', taskError)
          return NextResponse.json({ 
            error: `Failed to import task: ${taskData.title}`,
            details: taskError.message 
          }, { status: 500 })
        }

        importedTasks.push(task)
      }
    }

    return NextResponse.json({
      success: true,
      imported: {
        goals: importedGoals.length,
        tasks: importedTasks.length,
      },
      weekId,
      message: `Successfully imported ${importedGoals.length} goals and ${importedTasks.length} tasks`
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.issues)
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: error.issues 
      }, { status: 400 })
    }
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
