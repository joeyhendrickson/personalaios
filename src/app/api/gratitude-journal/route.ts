import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/gratitude-journal – list entries (recent first), with optional ?limit=
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
    const limit = parseInt(url.searchParams.get('limit') || '30')

    const { data: entries, error: fetchError } = await supabase
      .from('gratitude_journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false })
      .limit(limit)

    if (fetchError) {
      console.error('Error fetching gratitude entries:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch entries', details: fetchError.message },
        { status: 500 }
      )
    }

    // Streak calculation: consecutive days with challenge_completed = true
    const { data: streakData } = await supabase
      .from('gratitude_journal_entries')
      .select('entry_date, challenge_completed')
      .eq('user_id', user.id)
      .eq('challenge_completed', true)
      .order('entry_date', { ascending: false })
      .limit(365)

    let currentStreak = 0
    if (streakData && streakData.length > 0) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      let checkDate = new Date(today)

      // Allow today or yesterday as starting point
      const latestEntry = new Date(streakData[0].entry_date + 'T00:00:00')
      const diffMs = today.getTime() - latestEntry.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      if (diffDays > 1) {
        currentStreak = 0
      } else {
        checkDate = latestEntry
        const dateSet = new Set(streakData.map((d) => d.entry_date))
        while (dateSet.has(checkDate.toISOString().split('T')[0])) {
          currentStreak++
          checkDate.setDate(checkDate.getDate() - 1)
        }
      }
    }

    // Today's entry status
    const todayStr = new Date().toISOString().split('T')[0]
    const todaysEntry = (entries || []).find((e: any) => e.entry_date === todayStr)

    return NextResponse.json({
      entries: entries || [],
      streak: currentStreak,
      todayCompleted: todaysEntry?.challenge_completed || false,
      todaysEntry: todaysEntry || null,
      totalEntries: entries?.length || 0,
    })
  } catch (error) {
    console.error('Unexpected error in gratitude journal GET:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// POST /api/gratitude-journal – create or update today's entry
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
    const { gratitude_items, reflection, mood_rating, entry_date } = body

    if (!gratitude_items || !Array.isArray(gratitude_items)) {
      return NextResponse.json(
        { error: 'gratitude_items must be an array of strings' },
        { status: 400 }
      )
    }

    const dateToUse = entry_date || new Date().toISOString().split('T')[0]

    // Upsert: create or update for the given date
    const { data: entry, error: upsertError } = await supabase
      .from('gratitude_journal_entries')
      .upsert(
        {
          user_id: user.id,
          entry_date: dateToUse,
          gratitude_items,
          reflection: reflection || null,
          mood_rating: mood_rating || null,
        },
        { onConflict: 'user_id,entry_date' }
      )
      .select()
      .single()

    if (upsertError) {
      console.error('Error upserting gratitude entry:', upsertError)
      return NextResponse.json(
        { error: 'Failed to save entry', details: upsertError.message },
        { status: 500 }
      )
    }

    // Award points if challenge completed and not already awarded
    if (entry.challenge_completed && (!entry.points_awarded || entry.points_awarded === 0)) {
      const pointsToAward = 50

      const { error: pointsError } = await supabase.from('points_ledger').insert({
        user_id: user.id,
        points: pointsToAward,
        description: `Gratitude Journal: completed nightly challenge for ${dateToUse}`,
      })

      if (!pointsError) {
        await supabase
          .from('gratitude_journal_entries')
          .update({ points_awarded: pointsToAward })
          .eq('id', entry.id)

        entry.points_awarded = pointsToAward
      }
    }

    return NextResponse.json({ entry, success: true })
  } catch (error) {
    console.error('Unexpected error in gratitude journal POST:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// DELETE /api/gratitude-journal?id=<uuid> – remove an entry
export async function DELETE(request: NextRequest) {
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
    const id = url.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('gratitude_journal_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting gratitude entry:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete entry', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in gratitude journal DELETE:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
