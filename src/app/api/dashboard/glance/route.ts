import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizeBiometricRow } from '@/lib/fitness/normalize-biometrics'
import type { BankAccountRow, ManualAccountRow } from '@/lib/budget/net-worth-series'
import {
  composeAiInsight,
  computeAccountTotals,
  computeHealthGlance,
  firstNameFromDisplay,
  greetingForHour,
  selectTodayPlan,
  selectTopFocus,
  selectUpcoming,
  type GlanceFinance,
} from '@/lib/dashboard/glance'

export const dynamic = 'force-dynamic'

async function safeRows(
  promise: PromiseLike<{ data: unknown; error: { message: string } | null }>
): Promise<Array<Record<string, unknown>>> {
  try {
    const { data, error } = await promise
    if (error) {
      console.warn('dashboard glance query skipped:', error.message)
      return []
    }
    return Array.isArray(data) ? (data as Array<Record<string, unknown>>) : []
  } catch (error) {
    console.warn('dashboard glance query failed:', error)
    return []
  }
}

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

    const [tasks, priorities, goals, projects, biometricRows, bankAccounts, manualAccounts] =
      await Promise.all([
        safeRows(
          supabase
            .from('tasks')
            .select(
              'id, title, status, priority, sort_order, weekly_goal_id, completed_at, created_at'
            )
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(80)
        ),
        safeRows(
          supabase
            .from('priorities')
            .select('id, title, is_completed')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20)
        ),
        safeRows(
          supabase
            .from('goals')
            .select('id, title, status, current_value, target_value, target_date, priority_level')
            .eq('user_id', user.id)
            .limit(40)
        ),
        safeRows(
          supabase
            .from('projects')
            .select('id, title, is_completed, current_points, target_points, deadline, target_date')
            .eq('user_id', user.id)
            .limit(40)
        ),
        safeRows(
          supabase
            .from('fitness_biometrics')
            .select('*')
            .eq('user_id', user.id)
            .order('recorded_at', { ascending: false })
            .limit(14)
        ),
        safeRows(
          supabase
            .from('bank_accounts')
            .select('id, type, subtype, current_balance, bank_connection_id')
            .limit(80)
        ),
        safeRows(
          supabase.from('manual_accounts').select('account_type, amount').eq('user_id', user.id)
        ),
      ])

    const metadata = user.user_metadata || {}
    const firstName = firstNameFromDisplay(
      (metadata.full_name as string | undefined) || (metadata.name as string | undefined),
      user.email
    )
    const hour = new Date().getHours()
    const plan = selectTodayPlan(tasks, priorities)
    const health = computeHealthGlance(biometricRows.map((row) => normalizeBiometricRow(row)))
    const finance: GlanceFinance = computeAccountTotals(
      bankAccounts as BankAccountRow[],
      manualAccounts as ManualAccountRow[]
    )
    const upcoming = selectUpcoming(goals, projects)
    const focus = selectTopFocus(goals, projects, tasks)
    const insight = composeAiInsight({
      health,
      remainingTasks: plan.remaining,
      focusTitle: focus?.title || null,
      hasFinance: finance.netWorth != null,
    })

    return NextResponse.json(
      {
        firstName,
        avatarUrl:
          (metadata.avatar_url as string | undefined) ||
          (metadata.picture as string | undefined) ||
          null,
        greeting: greetingForHour(hour),
        plan,
        health,
        finance,
        upcoming,
        focus,
        insight,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (error) {
    console.error('GET /api/dashboard/glance:', error)
    return NextResponse.json(
      {
        error: 'Failed to load homepage glance',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
