import type { SupabaseClient } from '@supabase/supabase-js'
import { evaluateEarnedBadgeIds } from '@/lib/sobriety/badges'
import { computeDrinkSavings } from '@/lib/sobriety/savings'
import { computeSoberStreak, countSoberDays } from '@/lib/sobriety/streak'
import { SOBRIETY_POINTS_PER_SOBER_DAY } from '@/lib/sobriety/types'

type DailyLog = {
  id: string
  log_date: string
  drank: boolean
  points_awarded: number
}

export async function awardSoberDayPoints(
  supabase: SupabaseClient,
  userId: string,
  log: DailyLog
): Promise<number> {
  if (log.drank || log.points_awarded > 0) return log.points_awarded

  const { error } = await supabase.from('points_ledger').insert({
    user_id: userId,
    points: SOBRIETY_POINTS_PER_SOBER_DAY,
    description: `Sobriety Tracker: sober day ${log.log_date}`,
  })

  if (error) {
    console.error('Failed to award sobriety points:', error)
    return 0
  }

  await supabase
    .from('sobriety_daily_logs')
    .update({ points_awarded: SOBRIETY_POINTS_PER_SOBER_DAY })
    .eq('id', log.id)
    .eq('user_id', userId)

  return SOBRIETY_POINTS_PER_SOBER_DAY
}

export async function syncSobrietyBadges(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const [
    { data: logs },
    { data: decisions },
    { data: places },
    { data: profile },
    { data: existing },
  ] = await Promise.all([
    supabase
      .from('sobriety_daily_logs')
      .select('log_date, drank')
      .eq('user_id', userId)
      .order('log_date', { ascending: false })
      .limit(400),
    supabase.from('sobriety_decision_logs').select('id').eq('user_id', userId),
    supabase
      .from('sobriety_influence_places')
      .select('id, visit_count, counts_as_sober_outing')
      .eq('user_id', userId)
      .eq('user_confirmed', true),
    supabase
      .from('sobriety_profiles')
      .select('typical_drink_cost, typical_drinks_per_week, typical_drinks_per_outing')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.from('sobriety_user_badges').select('badge_id').eq('user_id', userId),
  ])

  const today = new Date().toISOString().slice(0, 10)
  const streak = computeSoberStreak(logs || [], today)
  const soberDays = countSoberDays(logs || [])
  const savings = computeDrinkSavings({
    typicalDrinkCost: Number(profile?.typical_drink_cost ?? 8),
    typicalDrinksPerWeek: Number(profile?.typical_drinks_per_week ?? 7),
    typicalDrinksPerOuting: Number(profile?.typical_drinks_per_outing ?? 2),
    soberDayCount: soberDays,
    restaurantPlaces: (places || []).map((place) => ({
      visit_count: Number(place.visit_count ?? 0),
      counts_as_sober_outing: Boolean(place.counts_as_sober_outing),
    })),
  })

  const earned = evaluateEarnedBadgeIds({
    currentStreak: streak,
    totalSoberDays: soberDays,
    hasDrinkLog: (logs || []).some((l) => l.drank),
    decisionLogCount: decisions?.length ?? 0,
    confirmedPlaceCount: places?.length ?? 0,
    savedToDate: savings.savedToDate,
  })

  const already = new Set((existing || []).map((row) => row.badge_id))
  const newly = earned.filter((id) => !already.has(id))
  if (newly.length) {
    await supabase.from('sobriety_user_badges').insert(
      newly.map((badge_id) => ({
        user_id: userId,
        badge_id,
      }))
    )
  }
  return newly
}
