import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import {
  localDateString,
  localHourMinute,
  snapshotDailyEnergyForUser,
} from '@/lib/fitness/snapshot-daily-energy'

function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron')

  if (isVercelCron) return true
  if (!cronSecret) {
    return process.env.NODE_ENV === 'development'
  }
  return authHeader === `Bearer ${cronSecret}`
}

async function collectActiveUserIds(
  admin: ReturnType<typeof createAdminClient>
): Promise<string[]> {
  const ids = new Set<string>()

  const [{ data: bioUsers }, { data: healthUsers }, { data: pointsUsers }] = await Promise.all([
    admin.from('fitness_biometrics').select('user_id').limit(5000),
    admin.from('fitness_provider_connections').select('user_id').limit(5000),
    admin.from('points_ledger').select('user_id').limit(5000),
  ])

  for (const row of bioUsers ?? []) ids.add(row.user_id)
  for (const row of healthUsers ?? []) ids.add(row.user_id)
  for (const row of pointsUsers ?? []) ids.add(row.user_id)

  return [...ids]
}

/**
 * Runs hourly at :59. Snapshots users whose local time is in the 11pm hour (end-of-day).
 */
export async function GET(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const now = new Date()
    const userIds = await collectActiveUserIds(admin)

    if (userIds.length === 0) {
      return NextResponse.json({
        success: true,
        timestamp: now.toISOString(),
        usersChecked: 0,
        snapshotted: 0,
        skipped: 0,
        errors: [],
      })
    }

    const { data: profiles } = await admin
      .from('user_profiles')
      .select('user_id, timezone')
      .in('user_id', userIds)

    const timezoneByUser = new Map<string, string>()
    for (const p of profiles ?? []) {
      timezoneByUser.set(p.user_id, p.timezone || 'America/New_York')
    }

    let snapshotted = 0
    let skipped = 0
    const errors: string[] = []

    for (const userId of userIds) {
      const tz = timezoneByUser.get(userId) || 'America/New_York'
      const { hour } = localHourMinute(tz, now)

      if (hour !== 23) {
        skipped++
        continue
      }

      const logDate = localDateString(tz, now)
      const result = await snapshotDailyEnergyForUser(admin, userId, logDate)
      if (result.ok) {
        snapshotted++
      } else {
        errors.push(`${userId}: ${result.error}`)
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      usersChecked: userIds.length,
      snapshotted,
      skipped,
      errors: errors.slice(0, 20),
    })
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : 'Cron failed',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
