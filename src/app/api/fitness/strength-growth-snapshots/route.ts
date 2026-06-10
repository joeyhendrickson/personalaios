import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  computeStrengthStatsFingerprint,
  normalizeStrengthStatsForChart,
} from '@/lib/fitness/strength-growth-fingerprint'

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

    const { data, error } = await supabase
      .from('fitness_strength_growth_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      if (error.code === '42P01') return NextResponse.json([])
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch growth snapshots' },
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

    const body = await request.json().catch(() => ({}))
    const rawStats = Array.isArray(body?.stats) ? body.stats : []
    const force = body?.force === true

    const chartData = normalizeStrengthStatsForChart(rawStats)
    if (chartData.length === 0) {
      return NextResponse.json(
        { error: 'Log at least one strength stat before saving a growth chart.' },
        { status: 400 }
      )
    }

    const fingerprint = computeStrengthStatsFingerprint(rawStats)
    const exerciseCount = new Set(chartData.map((s) => s.exercise_name)).size

    if (!force) {
      const { data: existing } = await supabase
        .from('fitness_strength_growth_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .eq('stats_fingerprint', fingerprint)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ cached: true, snapshot: existing })
      }
    }

    const record = {
      user_id: user.id,
      stats_fingerprint: fingerprint,
      chart_data: chartData,
      exercise_count: exerciseCount,
      stat_count: chartData.length,
    }

    const insertRes = await supabase
      .from('fitness_strength_growth_snapshots')
      .insert(record)
      .select()
      .single()

    if (insertRes.error) {
      const code = insertRes.error.code
      const message = (insertRes.error.message || '').toLowerCase()
      if (code === '42P01' || message.includes('does not exist')) {
        return NextResponse.json(
          {
            error: 'Growth chart storage is not set up yet.',
            details: 'Run migration 085_fitness_strength_growth_snapshots.sql in Supabase.',
          },
          { status: 503 }
        )
      }
      return NextResponse.json({ error: insertRes.error.message }, { status: 500 })
    }

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'fitness_strength_growth_snapshot_saved',
      description: `Saved strength growth chart (${exerciseCount} exercises)`,
      metadata: { stat_count: chartData.length, exercise_count: exerciseCount },
    })

    return NextResponse.json({ cached: false, snapshot: insertRes.data })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to save growth snapshot' },
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
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('fitness_strength_growth_snapshots')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to delete snapshot' },
      { status: 500 }
    )
  }
}
