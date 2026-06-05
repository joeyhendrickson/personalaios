import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import {
  computeLeaderboard,
  startOfUtcDay,
  startOfUtcWeekMonday,
} from '@/lib/leaderboard/aggregate'

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Records the winner of the most recent COMPLETED week if not already recorded.
 * Idempotent via the UNIQUE(week_start) constraint. Lets us award gold stars
 * without a scheduled job — it happens lazily whenever the leaderboard loads.
 */
async function finalizePreviousWeek(admin: ReturnType<typeof createAdminClient>) {
  const thisWeekStart = startOfUtcWeekMonday()
  const prevWeekStart = new Date(thisWeekStart)
  prevWeekStart.setUTCDate(prevWeekStart.getUTCDate() - 7)
  const weekStartDate = toDateOnly(prevWeekStart)

  const { data: existing } = await admin
    .from('weekly_leader_trophies')
    .select('week_start')
    .eq('week_start', weekStartDate)
    .maybeSingle()
  if (existing) return

  const leaders = await computeLeaderboard(admin, prevWeekStart, thisWeekStart, 1)
  const winner = leaders[0]
  if (!winner) return

  await admin
    .from('weekly_leader_trophies')
    .insert({ user_id: winner.userId, week_start: weekStartDate, points: winner.points })
    // Ignore conflicts from concurrent requests racing to finalize.
    .select('id')
    .maybeSingle()
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const period = request.nextUrl.searchParams.get('period') === 'day' ? 'day' : 'week'
    const admin = createAdminClient()

    const since = period === 'day' ? startOfUtcDay() : startOfUtcWeekMonday()
    const leaders = await computeLeaderboard(admin, since, undefined, 10)

    // Lazily award last week's gold star (best-effort; never blocks the response).
    finalizePreviousWeek(admin).catch(() => {})

    return NextResponse.json({
      period,
      leaders,
      meRank: leaders.find((l) => l.userId === user.id)?.rank ?? null,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load leaderboard' },
      { status: 500 }
    )
  }
}
