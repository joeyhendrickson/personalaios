import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { LifestacksImportPayload } from '@/lib/import/lifestacks-import-schema'
import { LIFESTACKS_IMPORT_CATEGORIES } from '@/lib/import/lifestacks-import-schema'

const goalSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  goal_type: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']).default('monthly'),
  target_value: z.number().min(0).optional(),
  target_unit: z.string().max(50).optional(),
  priority_level: z.number().int().min(1).max(5).default(3),
  target_date: z.string().optional(),
  status: z.enum(['active', 'completed', 'paused', 'cancelled']).default('active'),
})

const projectSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.enum(LIFESTACKS_IMPORT_CATEGORIES).default('other'),
  target_points: z.number().int().min(0).default(0),
  target_money: z.number().min(0).default(0),
  linked_goal_title: z.string().optional(),
  deadline: z.string().optional(),
})

const taskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  project_title: z.string().optional(),
  points_value: z.number().int().min(0).default(0),
  money_value: z.number().min(0).default(0),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  estimated_time: z.string().optional(),
})

const habitSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  points_per_completion: z.number().int().min(1).max(1000).default(25),
  is_active: z.boolean().default(true),
})

const educationSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  points_value: z.number().int().min(1).max(10000).default(100),
  cost: z.number().min(0).optional(),
  priority_level: z.number().int().min(1).max(5).default(3),
  status: z.enum(['pending', 'in_progress', 'completed']).default('pending'),
  target_date: z.string().optional(),
})

const importDashboardSchema = z.object({
  goals: z.array(goalSchema).default([]),
  projects: z.array(projectSchema).default([]),
  tasks: z.array(taskSchema).default([]),
  habits: z.array(habitSchema).default([]),
  education: z.array(educationSchema).default([]),
})

async function getOrCreateCurrentWeekId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const weekStartStr = weekStart.toISOString().split('T')[0]
  const weekEndStr = weekEnd.toISOString().split('T')[0]

  const { data: existingWeek } = await supabase
    .from('weeks')
    .select('id')
    .eq('week_start', weekStartStr)
    .eq('week_end', weekEndStr)
    .single()

  if (existingWeek) return existingWeek.id

  const { data: newWeek, error } = await supabase
    .from('weeks')
    .insert({ week_start: weekStartStr, week_end: weekEndStr })
    .select('id')
    .single()

  if (error || !newWeek) throw new Error('Failed to create week')
  return newWeek.id
}

// POST /api/import/dashboard — import goals, projects, tasks, habits, and education
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
    const data = importDashboardSchema.parse(body) as LifestacksImportPayload

    const weekId = await getOrCreateCurrentWeekId(supabase)
    const goalTitleToId = new Map<string, string>()
    const projectTitleToMeta = new Map<string, { id: string; category: string }>()

    let importedGoals = 0
    let importedProjects = 0
    let importedTasks = 0
    let importedHabits = 0
    let importedEducation = 0
    const skippedTasks: string[] = []

    for (const goal of data.goals) {
      const { data: row, error } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          title: goal.title,
          description: goal.description || '',
          goal_type: goal.goal_type,
          target_value: goal.target_value,
          target_unit: goal.target_unit,
          priority_level: goal.priority_level,
          target_date: goal.target_date,
          status: goal.status,
        })
        .select('id, title')
        .single()

      if (error) {
        console.error('Error importing goal:', error)
        return NextResponse.json(
          { error: `Failed to import goal: ${goal.title}`, details: error.message },
          { status: 500 }
        )
      }
      goalTitleToId.set(row.title.toLowerCase(), row.id)
      importedGoals++
    }

    for (const project of data.projects) {
      const linkedGoalId = project.linked_goal_title
        ? goalTitleToId.get(project.linked_goal_title.toLowerCase())
        : undefined

      const { data: row, error } = await supabase
        .from('projects')
        .insert({
          week_id: weekId,
          user_id: user.id,
          title: project.title,
          description: project.description || '',
          category: project.category,
          target_points: project.target_points,
          target_money: project.target_money,
          goal_id: linkedGoalId ?? null,
        })
        .select('id, title, category')
        .single()

      if (error) {
        console.error('Error importing project:', error)
        return NextResponse.json(
          { error: `Failed to import project: ${project.title}`, details: error.message },
          { status: 500 }
        )
      }
      projectTitleToMeta.set(row.title.toLowerCase(), { id: row.id, category: row.category })
      importedProjects++
    }

    const defaultProjectId = data.projects[0]
      ? projectTitleToMeta.get(data.projects[0].title.toLowerCase())?.id
      : undefined

    for (const task of data.tasks) {
      const projectKey = task.project_title?.toLowerCase() || ''
      const projectMeta = projectTitleToMeta.get(projectKey)
      const weeklyGoalId = projectMeta?.id ?? defaultProjectId

      if (!weeklyGoalId) {
        skippedTasks.push(task.title)
        continue
      }

      const { error } = await supabase.from('tasks').insert({
        weekly_goal_id: weeklyGoalId,
        user_id: user.id,
        title: task.title,
        description: task.description || '',
        category: (projectMeta?.category ||
          'other') as (typeof LIFESTACKS_IMPORT_CATEGORIES)[number],
        points_value: task.points_value,
        money_value: task.money_value,
      })

      if (error) {
        console.error('Error importing task:', error)
        return NextResponse.json(
          { error: `Failed to import task: ${task.title}`, details: error.message },
          { status: 500 }
        )
      }
      importedTasks++
    }

    const { data: lastHabit } = await supabase
      .from('daily_habits')
      .select('order_index')
      .eq('user_id', user.id)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle()

    let nextHabitOrder = lastHabit ? lastHabit.order_index + 1 : 0

    for (const habit of data.habits) {
      const { error } = await supabase.from('daily_habits').insert({
        user_id: user.id,
        title: habit.title,
        description: habit.description || '',
        points_per_completion: habit.points_per_completion,
        is_active: habit.is_active,
        order_index: nextHabitOrder++,
      })

      if (error) {
        console.error('Error importing habit:', error)
        return NextResponse.json(
          { error: `Failed to import habit: ${habit.title}`, details: error.message },
          { status: 500 }
        )
      }
      importedHabits++
    }

    for (const item of data.education) {
      const { error } = await supabase.from('education_items').insert({
        user_id: user.id,
        title: item.title,
        description: item.description || '',
        points_value: item.points_value,
        cost: item.cost,
        priority_level: item.priority_level,
        status: item.status,
        target_date: item.target_date,
      })

      if (error) {
        console.error('Error importing education item:', error)
        return NextResponse.json(
          { error: `Failed to import education item: ${item.title}`, details: error.message },
          { status: 500 }
        )
      }
      importedEducation++
    }

    const parts = [
      importedGoals && `${importedGoals} goal${importedGoals === 1 ? '' : 's'}`,
      importedProjects && `${importedProjects} project${importedProjects === 1 ? '' : 's'}`,
      importedTasks && `${importedTasks} task${importedTasks === 1 ? '' : 's'}`,
      importedHabits && `${importedHabits} habit${importedHabits === 1 ? '' : 's'}`,
      importedEducation &&
        `${importedEducation} education item${importedEducation === 1 ? '' : 's'}`,
    ].filter(Boolean)

    return NextResponse.json(
      {
        success: true,
        imported: {
          goals: importedGoals,
          projects: importedProjects,
          tasks: importedTasks,
          habits: importedHabits,
          education: importedEducation,
          skippedTasks,
        },
        weekId,
        message: parts.length
          ? `Successfully imported ${parts.join(', ')}`
          : 'No rows found to import',
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Unexpected import error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
