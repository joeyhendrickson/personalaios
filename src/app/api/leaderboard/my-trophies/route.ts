import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { computeLeaderboard, startOfUtcWeekMonday } from '@/lib/leaderboard/aggregate'

// Returns the signed-in user's gold-star count (past weeks won) plus whether
// they're currently #1 this week (live leader).
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    const { count } = await admin
      .from('weekly_leader_trophies')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const leaders = await computeLeaderboard(admin, startOfUtcWeekMonday(), undefined, 1)
    const isCurrentWeekLeader = leaders[0]?.userId === user.id && (leaders[0]?.points ?? 0) > 0

    return NextResponse.json({
      trophyCount: count ?? 0,
      isCurrentWeekLeader,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load trophies' },
      { status: 500 }
    )
  }
}
