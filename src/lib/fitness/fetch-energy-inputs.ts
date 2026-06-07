import type { SupabaseClient } from '@supabase/supabase-js'
import type { EnergyStressInputs } from '@/lib/fitness/compute-energy-stress'

type Db = SupabaseClient

function dayBoundsUtc(dateStr: string): { start: string; end: string } {
  return {
    start: `${dateStr}T00:00:00.000Z`,
    end: `${dateStr}T23:59:59.999Z`,
  }
}

function addDaysIso(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + delta)
  return dt.toISOString().slice(0, 10)
}

async function countInRange(
  db: Db,
  table: string,
  userId: string,
  dateStr: string,
  column = 'created_at'
): Promise<number> {
  const { start, end } = dayBoundsUtc(dateStr)
  const { count, error } = await db
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte(column, start)
    .lte(column, end)
  if (error) return 0
  return count ?? 0
}

async function countByDateColumn(
  db: Db,
  table: string,
  userId: string,
  dateStr: string,
  dateColumn: string
): Promise<number> {
  const { count, error } = await db
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq(dateColumn, dateStr)
  if (error) return 0
  return count ?? 0
}

async function fetchWeeklyAveragePoints(db: Db, userId: string, dateStr: string): Promise<number> {
  const dailyTotals: number[] = []
  for (let i = 6; i >= 0; i--) {
    const d = addDaysIso(dateStr, -i)
    const { start, end } = dayBoundsUtc(d)
    const { data } = await db
      .from('points_ledger')
      .select('points')
      .eq('user_id', userId)
      .gte('created_at', start)
      .lte('created_at', end)
    const total = (data ?? []).reduce((s, r) => s + (Number(r.points) || 0), 0)
    if (total > 0) dailyTotals.push(total)
  }
  if (dailyTotals.length === 0) return 0
  return dailyTotals.reduce((a, b) => a + b, 0) / dailyTotals.length
}

async function fetchDailyPoints(db: Db, userId: string, dateStr: string): Promise<number> {
  const { start, end } = dayBoundsUtc(dateStr)
  const { data } = await db
    .from('points_ledger')
    .select('points')
    .eq('user_id', userId)
    .gte('created_at', start)
    .lte('created_at', end)
  return (data ?? []).reduce((s, r) => s + (Number(r.points) || 0), 0)
}

async function fetchHabitCompletionRate(
  db: Db,
  userId: string,
  dateStr: string
): Promise<number | null> {
  const { count: knownHabits } = await db
    .from('daily_habits')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true)

  if (!knownHabits || knownHabits === 0) return null

  const { start, end } = dayBoundsUtc(dateStr)
  const { count: completed } = await db
    .from('habit_completions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('completed_at', start)
    .lte('completed_at', end)

  return (completed ?? 0) / knownHabits
}

async function fetchWearableForDay(
  db: Db,
  userId: string,
  dateStr: string
): Promise<{
  sleep_hours: number | null
  resting_heart_rate: number | null
  steps: number | null
}> {
  const { data } = await db
    .from('fitness_biometrics')
    .select('sleep_hours, resting_heart_rate, steps, sync_date, source, recorded_at')
    .eq('user_id', userId)
    .eq('sync_date', dateStr)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (data) {
    return {
      sleep_hours: data.sleep_hours != null ? Number(data.sleep_hours) : null,
      resting_heart_rate: data.resting_heart_rate != null ? Number(data.resting_heart_rate) : null,
      steps: data.steps != null ? Number(data.steps) : null,
    }
  }

  const { start, end } = dayBoundsUtc(dateStr)
  const { data: fallback } = await db
    .from('fitness_biometrics')
    .select('sleep_hours, resting_heart_rate, steps')
    .eq('user_id', userId)
    .gte('recorded_at', start)
    .lte('recorded_at', end)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    sleep_hours: fallback?.sleep_hours != null ? Number(fallback.sleep_hours) : null,
    resting_heart_rate:
      fallback?.resting_heart_rate != null ? Number(fallback.resting_heart_rate) : null,
    steps: fallback?.steps != null ? Number(fallback.steps) : null,
  }
}

function isCashAccount(type: string | null, subtype: string | null): boolean {
  const t = (type || '').toLowerCase()
  const st = (subtype || '').toLowerCase()
  if (t === 'depository' || st === 'checking' || st === 'savings') return true
  if (t === 'credit' || st.includes('credit')) return true
  return false
}

async function fetchTotalCashDropPercent(
  db: Db,
  userId: string,
  dateStr: string
): Promise<number | null> {
  const { data: connections } = await db.from('bank_connections').select('id').eq('user_id', userId)

  const connectionIds = (connections ?? []).map((c) => c.id)
  if (connectionIds.length === 0) return null

  const { data: accounts } = await db
    .from('bank_accounts')
    .select('id, type, subtype, current_balance')
    .in('bank_connection_id', connectionIds)

  const cashAccounts = (accounts ?? []).filter((a) => isCashAccount(a.type, a.subtype))
  if (cashAccounts.length === 0) return null

  const accountIds = cashAccounts.map((a) => a.id)
  const yesterday = addDaysIso(dateStr, -1)

  const { data: txs } = await db
    .from('transactions')
    .select('bank_account_id, date, amount')
    .in('bank_account_id', accountIds)
    .gte('date', yesterday)
    .lte('date', dateStr)

  const suffixByAccount: Record<string, number> = {}
  for (const acc of cashAccounts) suffixByAccount[acc.id] = 0

  for (const tx of txs ?? []) {
    if (tx.date > dateStr) {
      suffixByAccount[tx.bank_account_id] =
        (suffixByAccount[tx.bank_account_id] ?? 0) + (Number(tx.amount) || 0)
    }
  }

  let cashToday = 0
  for (const acc of cashAccounts) {
    const current = Number(acc.current_balance) || 0
    const suf = suffixByAccount[acc.id] ?? 0
    const t = (acc.type || '').toLowerCase()
    const st = (acc.subtype || '').toLowerCase()
    if (t === 'credit' || st.includes('credit')) {
      if (current < 0) cashToday += Math.abs(current) - suf
    } else {
      cashToday += current + suf
    }
  }

  const suffixYesterday: Record<string, number> = {}
  for (const acc of cashAccounts) suffixYesterday[acc.id] = 0
  for (const tx of txs ?? []) {
    if (tx.date > yesterday) {
      suffixYesterday[tx.bank_account_id] =
        (suffixYesterday[tx.bank_account_id] ?? 0) + (Number(tx.amount) || 0)
    }
  }

  let cashYesterday = 0
  for (const acc of cashAccounts) {
    const current = Number(acc.current_balance) || 0
    const suf = suffixYesterday[acc.id] ?? 0
    const t = (acc.type || '').toLowerCase()
    const st = (acc.subtype || '').toLowerCase()
    if (t === 'credit' || st.includes('credit')) {
      if (current < 0) cashYesterday += Math.abs(current) - suf
    } else {
      cashYesterday += current + suf
    }
  }

  if (cashYesterday <= 0) return null
  const drop = ((cashYesterday - cashToday) / cashYesterday) * 100
  return Math.max(0, Math.round(drop * 100) / 100)
}

export async function fetchEnergyStressInputs(
  db: Db,
  userId: string,
  dateStr: string
): Promise<
  EnergyStressInputs & {
    sleep_hours: number | null
    resting_heart_rate: number | null
    steps: number | null
  }
> {
  const wearable = await fetchWearableForDay(db, userId, dateStr)
  const [dailyPoints, weeklyAveragePoints, habitCompletionRate, totalCashDropPercent] =
    await Promise.all([
      fetchDailyPoints(db, userId, dateStr),
      fetchWeeklyAveragePoints(db, userId, dateStr),
      fetchHabitCompletionRate(db, userId, dateStr),
      fetchTotalCashDropPercent(db, userId, dateStr),
    ])

  const [
    iamPresentEntriesToday,
    dreamCatcherLogsToday,
    gratitudeJournalLogsToday,
    relationshipManagerLogsToday,
    selfCareRewardsExchangeToday,
    groceryOptimizerLogsToday,
    datingGoalsAddedToday,
    marketPredictionsCreatedToday,
    dashboardGoalsAddedToday,
    dashboardProjectsAddedToday,
  ] = await Promise.all([
    countInRange(db, 'narrative_integration_sessions', userId, dateStr),
    countInRange(db, 'dream_catcher_sessions', userId, dateStr, 'completed_at'),
    countByDateColumn(db, 'gratitude_journal_entries', userId, dateStr, 'entry_date'),
    countInRange(db, 'relationship_notes', userId, dateStr),
    countRedeemedRewardsToday(db, userId, dateStr),
    countInRange(db, 'grocery_receipts', userId, dateStr),
    countInRange(db, 'dating_prospects', userId, dateStr),
    countInRange(db, 'trading_analyses', userId, dateStr),
    countInRange(db, 'goals', userId, dateStr),
    countInRange(db, 'projects', userId, dateStr),
  ])

  return {
    previousNightSleepHours: wearable.sleep_hours,
    restingHeartRate: wearable.resting_heart_rate,
    steps: wearable.steps,
    sleep_hours: wearable.sleep_hours,
    resting_heart_rate: wearable.resting_heart_rate,
    dailyPoints,
    weeklyAveragePoints,
    habitCompletionRate,
    iamPresentEntriesToday,
    totalCashDropPercent,
    dreamCatcherLogsToday,
    gratitudeJournalLogsToday,
    relationshipManagerLogsToday,
    selfCareRewardsExchangeToday,
    groceryOptimizerLogsToday,
    datingGoalsAddedToday,
    marketPredictionsCreatedToday,
    dashboardGoalsAddedToday,
    dashboardProjectsAddedToday,
  }
}

async function countRedeemedRewardsToday(db: Db, userId: string, dateStr: string): Promise<number> {
  const { start, end } = dayBoundsUtc(dateStr)
  const { count } = await db
    .from('user_rewards')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_redeemed', true)
    .gte('redeemed_at', start)
    .lte('redeemed_at', end)
  return count ?? 0
}
