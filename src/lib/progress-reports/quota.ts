import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { ProgressReportQuota } from './types'
import { startOfCalendarWeek } from './period'

const STANDARD_WEEKLY_LIMIT = 1

export async function isPremiumUser(userId: string, email?: string | null): Promise<boolean> {
  const supabase = await createClient()

  const byUser = await supabase
    .from('subscriptions')
    .select('plan_type, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (byUser.data?.plan_type === 'premium') return true

  if (email) {
    const byEmail = await supabase
      .from('subscriptions')
      .select('plan_type, status')
      .eq('email', email)
      .eq('status', 'active')
      .maybeSingle()

    if (byEmail.data?.plan_type === 'premium') return true
  }

  return false
}

export async function getProgressReportQuota(
  userId: string,
  email?: string | null
): Promise<ProgressReportQuota> {
  const supabase = await createClient()
  const isPremium = await isPremiumUser(userId, email)

  if (isPremium) {
    return {
      isPremium: true,
      canGenerate: true,
      reportsUsedThisWeek: 0,
      weeklyLimit: 0,
      nextAvailableAt: null,
    }
  }

  const weekStart = startOfCalendarWeek(new Date())
  const { count, error } = await supabase
    .from('progress_reports')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', weekStart.toISOString())

  if (error) {
    console.error('[progress-reports] quota count failed:', error.message)
  }

  const reportsUsedThisWeek = count ?? 0
  const canGenerate = reportsUsedThisWeek < STANDARD_WEEKLY_LIMIT

  let nextAvailableAt: string | null = null
  if (!canGenerate) {
    const nextWeek = new Date(weekStart)
    nextWeek.setDate(nextWeek.getDate() + 7)
    nextAvailableAt = nextWeek.toISOString()
  }

  return {
    isPremium: false,
    canGenerate,
    reportsUsedThisWeek,
    weeklyLimit: STANDARD_WEEKLY_LIMIT,
    nextAvailableAt,
    message: canGenerate
      ? undefined
      : 'Standard accounts can generate 1 progress report per calendar week. Upgrade to Premium for unlimited reports.',
  }
}
