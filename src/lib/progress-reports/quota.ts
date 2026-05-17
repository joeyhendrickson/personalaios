import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { checkUserAccess } from '@/lib/access-control'
import type { ProgressReportQuota } from './types'
import { startOfCalendarWeek } from './period'

const STANDARD_WEEKLY_LIMIT = 1

const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'grace_period'] as const

function normalizePlanType(plan: string | null | undefined): string {
  return (plan || '').toLowerCase().trim()
}

function isPremiumPlanType(plan: string | null | undefined): boolean {
  const normalized = normalizePlanType(plan)
  return normalized === 'premium' || normalized.includes('premium')
}

/**
 * Resolves whether the user should receive premium benefits (e.g. unlimited progress reports).
 * Uses the same access signals as the rest of the app, with a service-role subscription read
 * so plan_type is not missed due to RLS or maybeSingle edge cases.
 */
export async function isPremiumUser(
  userId: string,
  email?: string | null,
  options?: { userMetadata?: Record<string, unknown> }
): Promise<boolean> {
  const access = await checkUserAccess(email ?? undefined, userId)
  if (normalizePlanType(access.subscriptionType) === 'premium') {
    return true
  }

  const accountType = options?.userMetadata?.account_type
  if (typeof accountType === 'string' && isPremiumPlanType(accountType)) {
    return true
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    admin = null
  }

  if (admin && email) {
    const { data: adminUser } = await admin
      .from('admin_users')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (adminUser) return true
  }

  const subscriptionIsPremium = (row: {
    plan_type?: string | null
    is_admin_managed?: boolean | null
    manually_disabled?: boolean | null
  }) => {
    if (row.manually_disabled) return false
    if (row.is_admin_managed && isPremiumPlanType(row.plan_type)) return true
    return isPremiumPlanType(row.plan_type)
  }

  if (admin) {
    const { data: subsByUser } = await admin
      .from('subscriptions')
      .select('plan_type, status, is_admin_managed, manually_disabled')
      .eq('user_id', userId)
      .in('status', [...ACTIVE_SUBSCRIPTION_STATUSES])
      .order('updated_at', { ascending: false })
      .limit(20)

    if (subsByUser?.some(subscriptionIsPremium)) return true

    if (email) {
      const { data: subsByEmail } = await admin
        .from('subscriptions')
        .select('plan_type, status, is_admin_managed, manually_disabled, user_id')
        .eq('email', email)
        .in('status', [...ACTIVE_SUBSCRIPTION_STATUSES])
        .order('updated_at', { ascending: false })
        .limit(20)

      if (subsByEmail?.some(subscriptionIsPremium)) return true
    }

    const { data: planStatus } = await admin
      .from('user_plan_status')
      .select('current_plan')
      .eq('user_id', userId)
      .maybeSingle()

    if (planStatus && isPremiumPlanType(planStatus.current_plan as string)) {
      return true
    }
  }

  // Fallback: user-scoped read (matches RLS-visible rows)
  const supabase = await createClient()
  const { data: visibleSubs } = await supabase
    .from('subscriptions')
    .select('plan_type, is_admin_managed, manually_disabled')
    .eq('user_id', userId)
    .in('status', [...ACTIVE_SUBSCRIPTION_STATUSES])
    .order('updated_at', { ascending: false })
    .limit(20)

  return visibleSubs?.some(subscriptionIsPremium) ?? false
}

export async function getProgressReportQuota(
  userId: string,
  email?: string | null,
  options?: { userMetadata?: Record<string, unknown> }
): Promise<ProgressReportQuota> {
  const supabase = await createClient()
  const isPremium = await isPremiumUser(userId, email, options)

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
