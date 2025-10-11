import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/total-habit-trophies/check-all - Manually check and award all eligible trophies
export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's total habit completions count
    const { data: habitCompletions, error: completionError } = await supabase
      .from('habit_completions')
      .select('id')
      .eq('user_id', user.id)

    if (completionError) {
      console.error('Error fetching habit completions:', completionError)
      return NextResponse.json({ error: 'Failed to fetch completions' }, { status: 500 })
    }

    const totalCompletions = habitCompletions?.length || 0

    // Get all trophies that could be earned at this total completion count
    const { data: availableTrophies, error: trophiesError } = await supabase
      .from('total_habit_trophies')
      .select('*')
      .lte('total_completions_required', totalCompletions)
      .order('total_completions_required', { ascending: true })

    if (trophiesError) {
      console.error('Error fetching trophies:', trophiesError)
      return NextResponse.json({ error: 'Failed to fetch trophies' }, { status: 500 })
    }

    // Get already earned trophies
    const { data: earnedTrophies, error: earnedError } = await supabase
      .from('user_total_habit_trophies')
      .select('trophy_id')
      .eq('user_id', user.id)

    if (earnedError) {
      console.error('Error fetching earned trophies:', earnedError)
      return NextResponse.json({ error: 'Failed to fetch earned trophies' }, { status: 500 })
    }

    const earnedTrophyIds = new Set(earnedTrophies?.map((et) => et.trophy_id) || [])
    const newTrophies = availableTrophies?.filter((trophy) => !earnedTrophyIds.has(trophy.id)) || []

    const awardedTrophies = []

    // Award new trophies
    for (const trophy of newTrophies) {
      const { data: newTrophy, error: insertError } = await supabase
        .from('user_total_habit_trophies')
        .insert({
          user_id: user.id,
          trophy_id: trophy.id,
          total_completions_at_time: totalCompletions,
        })
        .select(
          `
          *,
          total_habit_trophies (*)
        `
        )
        .single()

      if (insertError) {
        console.error('Error awarding trophy:', insertError)
      } else {
        awardedTrophies.push(newTrophy)
      }
    }

    return NextResponse.json({
      message: `Checked trophies for ${totalCompletions} total completions`,
      totalCompletions,
      eligibleTrophies: availableTrophies?.length || 0,
      alreadyEarned: earnedTrophyIds.size,
      newlyAwarded: awardedTrophies.length,
      awardedTrophies: awardedTrophies.map((t) => t.total_habit_trophies.name),
    })
  } catch (error) {
    console.error('Error in total-habit-trophies check-all POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
