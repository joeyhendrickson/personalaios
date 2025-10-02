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

    const { data: stats, error } = await supabase
      .from('fitness_stats')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })

    if (error) {
      console.error('Error fetching fitness stats:', error)
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    return NextResponse.json(stats || [])
  } catch (error) {
    console.error('Error in fitness stats GET:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch fitness stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

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
    const { stats } = body

    if (!stats || !Array.isArray(stats)) {
      return NextResponse.json({ error: 'Stats array is required' }, { status: 400 })
    }

    console.log(`Creating fitness stats for user: ${user.id}`)
    console.log(`Number of stats: ${stats.length}`)

    // Validate each stat
    for (const stat of stats) {
      if (
        !stat.stat_type ||
        !stat.exercise_name ||
        !stat.measurement_value ||
        !stat.measurement_unit
      ) {
        return NextResponse.json(
          {
            error:
              'Each stat must have stat_type, exercise_name, measurement_value, and measurement_unit',
          },
          { status: 400 }
        )
      }
    }

    // Insert all stats
    const { data: insertedStats, error } = await supabase
      .from('fitness_stats')
      .insert(
        stats.map((stat) => ({
          user_id: user.id,
          stat_type: stat.stat_type,
          exercise_name: stat.exercise_name,
          measurement_value: stat.measurement_value,
          measurement_unit: stat.measurement_unit,
          rep_range: stat.rep_range,
          notes: stat.notes,
        }))
      )
      .select()

    if (error) {
      console.error('Error creating fitness stats:', error)
      return NextResponse.json({ error: 'Failed to create stats' }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'fitness_stats_logged',
      description: `Logged ${stats.length} fitness statistics`,
      metadata: {
        stat_types: [...new Set(stats.map((s) => s.stat_type))],
        exercise_count: stats.length,
      },
    })

    return NextResponse.json(insertedStats)
  } catch (error) {
    console.error('Error in fitness stats POST:', error)
    return NextResponse.json(
      {
        error: 'Failed to create fitness stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Stat ID is required' }, { status: 400 })
    }

    const { data: stat, error } = await supabase
      .from('fitness_stats')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating fitness stat:', error)
      return NextResponse.json({ error: 'Failed to update stat' }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'fitness_stat_updated',
      description: `Updated fitness stat: ${stat.exercise_name}`,
      metadata: {
        stat_id: id,
        updates: Object.keys(updates),
      },
    })

    return NextResponse.json(stat)
  } catch (error) {
    console.error('Error in fitness stats PUT:', error)
    return NextResponse.json(
      {
        error: 'Failed to update fitness stat',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Stat ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('fitness_stats')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting fitness stat:', error)
      return NextResponse.json({ error: 'Failed to delete stat' }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'fitness_stat_deleted',
      description: 'Deleted fitness stat',
      metadata: {
        stat_id: id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in fitness stats DELETE:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete fitness stat',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
