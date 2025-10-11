import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/priorities/sync-fires - Automatically sync fires category items to priorities
// Simple in-memory rate limiting (in production, use Redis or similar)
const syncCooldown = new Map<string, number>()
const SYNC_COOLDOWN_MS = 5000 // 5 seconds cooldown between syncs

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

    // Rate limiting check
    const now = Date.now()
    const lastSync = syncCooldown.get(user.id)

    if (lastSync && now - lastSync < SYNC_COOLDOWN_MS) {
      console.log(`⏰ Sync rate limited for user ${user.id}, last sync was ${now - lastSync}ms ago`)
      return NextResponse.json(
        {
          message: 'Sync rate limited, please wait before syncing again',
          cooldownRemaining: SYNC_COOLDOWN_MS - (now - lastSync),
        },
        { status: 429 }
      )
    }

    // Update last sync time
    syncCooldown.set(user.id, now)

    console.log('🔄 Syncing fires priorities for user:', user.id)

    // Get all active fires category goals
    const { data: firesGoals, error: goalsError } = await supabase
      .from('weekly_goals')
      .select('id, title, description, category, current_points, target_points')
      .eq('user_id', user.id)
      .eq('category', 'fires')
      .order('created_at', { ascending: false })

    if (goalsError) {
      console.error('Error fetching fires goals:', goalsError)
      return NextResponse.json({ error: 'Failed to fetch fires goals' }, { status: 500 })
    }

    // Get all pending fires category tasks
    const { data: firesTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, description, category, points_value, money_value, weekly_goal_id, status')
      .eq('user_id', user.id)
      .eq('category', 'fires')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (tasksError) {
      console.error('Error fetching fires tasks:', tasksError)
      return NextResponse.json({ error: 'Failed to fetch fires tasks' }, { status: 500 })
    }

    // FIXED: Use UPSERT logic instead of DELETE+INSERT to prevent duplicates
    console.log('🔄 Using UPSERT logic to prevent duplicates...')

    const newPriorities = []

    // Add fires goals as priorities using UPSERT logic
    if (firesGoals && firesGoals.length > 0) {
      for (const goal of firesGoals) {
        const progress =
          goal.target_points > 0 ? Math.round((goal.current_points / goal.target_points) * 100) : 0
        const isCompleted = progress >= 100

        // Check if priority already exists for this project
        const { data: existingPriority } = await supabase
          .from('priorities')
          .select('id, title, is_completed')
          .eq('user_id', user.id)
          .eq('priority_type', 'fire_auto')
          .eq('title', `🔥 ${goal.title}`)
          .eq('is_deleted', false)
          .single()

        if (existingPriority) {
          // Update existing priority
          const { data: updatedPriority, error: updateError } = await supabase
            .from('priorities')
            .update({
              description: `Fire Goal: ${goal.description || 'Complete this urgent goal'} (${progress}% complete)`,
              priority_score: 95,
              is_completed: isCompleted,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingPriority.id)
            .select()

          if (updateError) {
            console.error(`Error updating priority for goal ${goal.id}:`, updateError)
          } else {
            console.log(`✅ Updated existing priority for goal: ${goal.title}`)
            newPriorities.push(updatedPriority[0])
          }
        } else {
          // Insert new priority
          const { data: newPriority, error: insertError } = await supabase
            .from('priorities')
            .insert({
              user_id: user.id,
              title: `🔥 ${goal.title}`,
              description: `Fire Goal: ${goal.description || 'Complete this urgent goal'} (${progress}% complete)`,
              priority_type: 'fire_auto',
              priority_score: 95,
              is_completed: isCompleted,
            })
            .select()

          if (insertError) {
            console.error(`Error inserting priority for goal ${goal.id}:`, insertError)
          } else {
            console.log(`✅ Created new priority for goal: ${goal.title}`)
            newPriorities.push(newPriority[0])
          }
        }
      }
    }

    // Add fires tasks as priorities using INSERT/UPDATE logic
    if (firesTasks && firesTasks.length > 0) {
      for (const task of firesTasks) {
        // Check if priority already exists for this task
        const { data: existingPriority } = await supabase
          .from('priorities')
          .select('id, title, is_completed')
          .eq('user_id', user.id)
          .eq('priority_type', 'fire_auto')
          .eq('title', `🔥 ${task.title}`)
          .eq('is_deleted', false)
          .single()

        if (existingPriority) {
          // Update existing priority
          const { data: updatedPriority, error: updateError } = await supabase
            .from('priorities')
            .update({
              description: `Fire Task: ${task.description || 'Complete this urgent task'}`,
              priority_score: 90,
              is_completed: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingPriority.id)
            .select()

          if (updateError) {
            console.error(`Error updating priority for task ${task.id}:`, updateError)
          } else {
            console.log(`✅ Updated existing priority for task: ${task.title}`)
            newPriorities.push(updatedPriority[0])
          }
        } else {
          // Insert new priority
          const { data: newPriority, error: insertError } = await supabase
            .from('priorities')
            .insert({
              user_id: user.id,
              title: `🔥 ${task.title}`,
              description: `Fire Task: ${task.description || 'Complete this urgent task'}`,
              priority_type: 'fire_auto',
              priority_score: 90,
              is_completed: false,
            })
            .select()

          if (insertError) {
            console.error(`Error inserting priority for task ${task.id}:`, insertError)
          } else {
            console.log(`✅ Created new priority for task: ${task.title}`)
            newPriorities.push(newPriority[0])
          }
        }
      }
    }

    console.log(`✅ Synced ${newPriorities.length} fire priorities using UPSERT logic`)

    return NextResponse.json(
      {
        message: `Synced ${newPriorities.length} fire priorities`,
        count: newPriorities.length,
        goals: firesGoals?.length || 0,
        tasks: firesTasks?.length || 0,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error syncing fire priorities:', error)
    return NextResponse.json(
      {
        error: 'Failed to sync fire priorities',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
