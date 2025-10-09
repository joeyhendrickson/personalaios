import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/discipline-trophies/check-achievements - Check and award new trophies
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

    const { habitId } = await request.json()

    if (!habitId) {
      return NextResponse.json({ error: 'Habit ID is required' }, { status: 400 })
    }

    // Get actual habit completions and calculate count
    const { data: habitCompletions, error: completionError } = await supabase
      .from('daily_habit_completions')
      .select('id')
      .eq('user_id', user.id)
      .eq('habit_id', habitId)

    if (completionError) {
      console.error('Error fetching habit completions:', completionError)
      return NextResponse.json({ error: 'Failed to fetch completions' }, { status: 500 })
    }

    const currentCount = habitCompletions?.length || 0

    // Get all trophies that could be earned at this count
    const { data: availableTrophies, error: trophiesError } = await supabase
      .from('discipline_trophies')
      .select('*')
      .lte('habit_count_required', currentCount)
      .order('habit_count_required', { ascending: true })

    if (trophiesError) {
      console.error('Error fetching available trophies:', trophiesError)
      return NextResponse.json({ error: 'Failed to fetch trophies' }, { status: 500 })
    }

    // Get already earned trophies for this habit
    const { data: earnedTrophies, error: earnedError } = await supabase
      .from('user_discipline_trophies')
      .select('trophy_id')
      .eq('user_id', user.id)
      .eq('habit_id', habitId)

    if (earnedError) {
      console.error('Error fetching earned trophies:', earnedError)
      return NextResponse.json({ error: 'Failed to fetch earned trophies' }, { status: 500 })
    }

    const earnedTrophyIds = new Set(earnedTrophies?.map((t) => t.trophy_id) || [])

    // Find new trophies to award
    const newTrophies = availableTrophies?.filter((trophy) => !earnedTrophyIds.has(trophy.id)) || []

    const awardedTrophies = []

    // Award new trophies
    for (const trophy of newTrophies) {
      const { data: newTrophy, error: insertError } = await supabase
        .from('user_discipline_trophies')
        .insert({
          user_id: user.id,
          trophy_id: trophy.id,
          habit_id: habitId,
        })
        .select(
          `
          *,
          discipline_trophies (*),
          daily_habits (title)
        `
        )
        .single()

      if (insertError) {
        console.error('Error awarding trophy:', insertError)
        continue
      }

      awardedTrophies.push(newTrophy)
    }

    return NextResponse.json({
      awardedTrophies,
      currentCount,
      message:
        awardedTrophies.length > 0
          ? `Congratulations! You've earned ${awardedTrophies.length} new discipline trophy${awardedTrophies.length > 1 ? 'ies' : ''}!`
          : 'No new trophies earned at this time.',
    })
  } catch (error) {
    console.error('Error in check achievements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
