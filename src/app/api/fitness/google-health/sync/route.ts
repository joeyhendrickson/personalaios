import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getValidHealthAccessToken,
  type FitnessProviderConnection,
} from '@/lib/fitness/provider-connection'
import { fetchDailySteps, fetchSleepMinutes, fetchRestingHeartRate } from '@/lib/google-health'
import { computeContextualEnergyLevel } from '@/lib/fitness/contextual-energy'
import { normalizeBiometricRow } from '@/lib/fitness/normalize-biometrics'

export const dynamic = 'force-dynamic'

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function toInt(value: unknown): number | null {
  const n = toNumber(value)
  return n === null ? null : Math.round(n)
}

function isMissingColumnError(error: { message?: string } | null): boolean {
  const msg = (error?.message || '').toLowerCase()
  return (
    msg.includes('column') && (msg.includes('does not exist') || msg.includes('could not find'))
  )
}

function isUpsertFallbackError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false
  if (isMissingColumnError(error)) return true
  const msg = (error.message || '').toLowerCase()
  return (
    msg.includes('on conflict') ||
    msg.includes('no unique') ||
    msg.includes('unique constraint') ||
    error.code === '42P10'
  )
}

function ymd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

type BiometricWriteRow = {
  sleep_hours: number | null
  resting_heart_rate: number | null
  steps: number | null
  contextual_energy_level_1_10: number
  source: string
  fitbit_opt_in: boolean
  recorded_at: string
  sync_date?: string
}

type WriteClient = Awaited<ReturnType<typeof createClient>>

async function upsertGoogleHealthDay(
  db: WriteClient,
  userId: string,
  syncDate: string,
  row: BiometricWriteRow
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const payloads: Record<string, unknown>[] = [
    { user_id: userId, ...row, sync_date: syncDate },
    { user_id: userId, ...row },
    (() => {
      const { source: _s, steps: _st, sync_date: _sd, ...rest } = row
      return { user_id: userId, ...rest, sync_date: syncDate }
    })(),
    (() => {
      const { source: _s, steps: _st, sync_date: _sd, ...rest } = row
      return { user_id: userId, ...rest }
    })(),
  ]

  // Prefer stable per-day upsert when sync_date column exists.
  for (const payload of payloads) {
    const { data, error } = await db
      .from('fitness_biometrics')
      .upsert(payload, { onConflict: 'user_id,sync_date,source' })
      .select('id')
      .maybeSingle()

    if (!error && data?.id) return { ok: true, id: data.id }
    if (error && !isUpsertFallbackError(error)) {
      return { ok: false, error: error.message }
    }
  }

  // Fallback: find today's google_health row by sync_date or recorded_at window.
  let existingId: string | undefined

  const bySyncDate = await db
    .from('fitness_biometrics')
    .select('id')
    .eq('user_id', userId)
    .eq('source', 'google_health')
    .eq('sync_date', syncDate)
    .maybeSingle()

  if (!bySyncDate.error && bySyncDate.data?.id) {
    existingId = bySyncDate.data.id
  } else if (isMissingColumnError(bySyncDate.error)) {
    const dayStart = new Date(`${syncDate}T00:00:00`)
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
    const byWindow = await db
      .from('fitness_biometrics')
      .select('id')
      .eq('user_id', userId)
      .eq('source', 'google_health')
      .gte('recorded_at', dayStart.toISOString())
      .lt('recorded_at', dayEnd.toISOString())
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!byWindow.error) existingId = byWindow.data?.id
  }

  for (const payload of payloads) {
    const op = existingId
      ? db.from('fitness_biometrics').update(payload).eq('id', existingId)
      : db.from('fitness_biometrics').insert(payload)

    const { data, error } = await op.select('id').maybeSingle()
    if (!error && data?.id) return { ok: true, id: data.id }
    if (error && !isUpsertFallbackError(error)) {
      return { ok: false, error: error.message }
    }
  }

  return { ok: false, error: 'Could not save synced biometrics row' }
}

async function fetchUserBiometrics(db: WriteClient, userId: string) {
  const { data, error } = await db
    .from('fitness_biometrics')
    .select('*')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false })
    .limit(90)

  if (error) return { biometrics: [], error: error.message }
  return {
    biometrics: (data || []).map((row) => normalizeBiometricRow(row as Record<string, unknown>)),
    error: null,
  }
}

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let accessToken: string
    let connection: FitnessProviderConnection
    try {
      const result = await getValidHealthAccessToken(supabase, user.id)
      accessToken = result.accessToken
      connection = result.connection
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Google Health not connected'
      const needsReauth = message.toLowerCase().includes('reconnect')
      return NextResponse.json({ error: message, needsReauth }, { status: 400 })
    }

    // Use admin client for writes so RLS cannot silently drop updates (0 rows affected).
    let db: WriteClient = supabase
    try {
      const { createAdminClient } = await import('@/lib/supabaseAdmin')
      db = createAdminClient() as unknown as WriteClient
    } catch {
      // Fall back to user-scoped client if service role is not configured.
    }

    const DAYS_TO_SYNC = 7
    const now = new Date()

    let daysImported = 0
    let daysFailed = 0
    let lastWriteError: string | null = null
    let sleepDays = 0
    let rhrDays = 0
    let stepsDays = 0
    let latestImported: {
      sleepHours: number | null
      restingHeartRate: number | null
      steps: number | null
      contextual_energy_level_1_10: number
    } | null = null

    for (let i = 0; i < DAYS_TO_SYNC; i++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const syncDate = ymd(day)

      let sleepHours: number | null = null
      let restingHeartRate: number | null = null
      let steps: number | null = null

      if (connection.import_sleep) {
        const minutes = await fetchSleepMinutes(accessToken, day)
        if (minutes && minutes > 0) sleepHours = Math.round((minutes / 60) * 100) / 100
      }

      if (connection.import_resting_heart_rate) {
        const rhr = await fetchRestingHeartRate(accessToken, day)
        if (rhr && rhr > 0) restingHeartRate = rhr
      }

      if (connection.import_steps) {
        const s = await fetchDailySteps(accessToken, day)
        if (typeof s === 'number' && s >= 0) steps = s
      }

      const { data: existingRow } = await db
        .from('fitness_biometrics')
        .select('sleep_hours, resting_heart_rate, steps')
        .eq('user_id', user.id)
        .eq('source', 'google_health')
        .eq('sync_date', syncDate)
        .maybeSingle()

      const mergedSleep = sleepHours ?? toNumber(existingRow?.sleep_hours)
      const mergedRhr = restingHeartRate ?? toInt(existingRow?.resting_heart_rate)
      const mergedSteps = steps ?? toInt(existingRow?.steps)

      if (mergedSleep === null && mergedRhr === null && mergedSteps === null) continue

      if (sleepHours !== null) sleepDays++
      if (restingHeartRate !== null) rhrDays++
      if (steps !== null) stepsDays++

      const { contextual_energy_level_1_10 } = computeContextualEnergyLevel({
        sleep_hours: mergedSleep,
        blood_pressure_systolic: null,
        blood_pressure_diastolic: null,
        resting_heart_rate: mergedRhr,
        stress_level_1_10: null,
        energy_level_self_1_10: null,
      })

      const startOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate())
      const recordedAt = i === 0 ? now : new Date(startOfDay.getTime() + 12 * 60 * 60 * 1000)

      const row: BiometricWriteRow = {
        sleep_hours: mergedSleep,
        resting_heart_rate: mergedRhr,
        steps: mergedSteps,
        contextual_energy_level_1_10,
        source: 'google_health',
        fitbit_opt_in: true,
        recorded_at: recordedAt.toISOString(),
        sync_date: syncDate,
      }

      const write = await upsertGoogleHealthDay(db, user.id, syncDate, row)
      if (!write.ok) {
        daysFailed++
        lastWriteError = write.error || 'Unknown database error'
        continue
      }

      daysImported++
      if (i === 0 || latestImported === null) {
        latestImported = {
          sleepHours: mergedSleep,
          restingHeartRate: mergedRhr,
          steps: mergedSteps,
          contextual_energy_level_1_10,
        }
      }
    }

    function buildSyncMessage() {
      const parts: string[] = []
      if (connection.import_sleep && sleepDays > 0) parts.push(`sleep (${sleepDays} days)`)
      if (connection.import_resting_heart_rate && rhrDays > 0)
        parts.push(`resting HR (${rhrDays} days)`)
      if (connection.import_steps && stepsDays > 0) parts.push(`steps (${stepsDays} days)`)
      if (parts.length === 0) {
        return `Synced ${daysImported} day${daysImported === 1 ? '' : 's'} from Google Health, but no wearable metrics were returned for this period.`
      }
      return `Synced ${daysImported} day${daysImported === 1 ? '' : 's'} from Google Health: ${parts.join(', ')}.`
    }

    const syncStamp = new Date().toISOString()
    const fresh = await fetchUserBiometrics(db, user.id)

    if (daysImported > 0) {
      await supabase
        .from('fitness_provider_connections')
        .update({ last_synced_at: syncStamp, last_sync_error: null })
        .eq('id', connection.id)
    } else if (daysFailed > 0) {
      await supabase
        .from('fitness_provider_connections')
        .update({
          last_sync_error:
            lastWriteError ||
            'Could not save synced data. Run migrations 060 and 074 in Supabase, then sync again.',
        })
        .eq('id', connection.id)
    } else {
      await supabase
        .from('fitness_provider_connections')
        .update({ last_synced_at: syncStamp, last_sync_error: null })
        .eq('id', connection.id)
    }

    if (daysImported === 0 && daysFailed > 0) {
      return NextResponse.json(
        {
          error: 'Synced from Google Health but could not save readings',
          details:
            lastWriteError ||
            'Run migrations 060_fitness_provider_connections.sql and 074_fitness_biometrics_sync_date.sql in Supabase, then sync again.',
          daysFailed,
          biometrics: fresh.biometrics,
        },
        { status: 500 }
      )
    }

    if (daysImported === 0) {
      return NextResponse.json({
        ok: true,
        daysImported,
        biometrics: fresh.biometrics,
        message: 'Connected, but no recent Google Health data was available yet.',
      })
    }

    return NextResponse.json({
      ok: true,
      daysImported,
      daysFailed,
      imported: latestImported,
      biometrics: fresh.biometrics,
      syncSummary: {
        sleepDays,
        rhrDays,
        stepsDays,
        metricsEnabled: {
          sleep: connection.import_sleep,
          restingHeartRate: connection.import_resting_heart_rate,
          steps: connection.import_steps,
        },
      },
      message: buildSyncMessage(),
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to sync Google Health data' },
      { status: 500 }
    )
  }
}
