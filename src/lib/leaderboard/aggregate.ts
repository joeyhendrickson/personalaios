import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { getProjectCategoryEmoji } from '@/lib/projects/category-emoji'

export type LeaderRow = {
  rank: number
  userId: string
  firstName: string
  points: number
  topLabel: string
  topEmoji: string
}

/** Start of today (UTC midnight). */
export function startOfUtcDay(d = new Date()): Date {
  const x = new Date(d)
  x.setUTCHours(0, 0, 0, 0)
  return x
}

/** Start of the current week — Monday 00:00 UTC, matching Postgres date_trunc('week'). */
export function startOfUtcWeekMonday(d = new Date()): Date {
  const x = startOfUtcDay(d)
  const day = x.getUTCDay() // 0=Sun..6=Sat
  const diff = day === 0 ? 6 : day - 1
  x.setUTCDate(x.getUTCDate() - diff)
  return x
}

function prettyCategory(category: string): string {
  return category
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

/** Bucket a ledger description into a coarse activity type when there's no category FK. */
function bucketFromDescription(desc: string | null | undefined): string | null {
  if (!desc) return null
  const d = desc.toLowerCase()
  if (d.startsWith('habit completed')) return 'Habits'
  if (d.startsWith('education completed')) return 'Education'
  if (d.startsWith('gratitude')) return 'Gratitude'
  if (d.startsWith('task completed')) return 'Tasks'
  return null
}

type LedgerRow = {
  user_id: string
  points: number
  task_id: string | null
  weekly_goal_id: string | null
  description: string | null
}

/**
 * Computes a ranked leaderboard from points_ledger over [since, until).
 * Requires a service-role client (reads across users). Returns only first name,
 * total points, and each user's top activity category/type — never PII.
 */
export async function computeLeaderboard(
  admin: SupabaseClient,
  since: Date,
  until?: Date,
  limit = 10
): Promise<LeaderRow[]> {
  let query = admin
    .from('points_ledger')
    .select('user_id, points, task_id, weekly_goal_id, description')
    .gte('created_at', since.toISOString())
    .gt('points', 0)
    .order('created_at', { ascending: false })
    .limit(20000)
  if (until) query = query.lt('created_at', until.toISOString())

  const { data: rows, error } = await query
  if (error) throw new Error(error.message)

  const ledger = (rows ?? []) as LedgerRow[]
  if (ledger.length === 0) return []

  // Batch-fetch categories for task/project-linked rows.
  const taskIds = [...new Set(ledger.map((r) => r.task_id).filter(Boolean))] as string[]
  const projectIds = [...new Set(ledger.map((r) => r.weekly_goal_id).filter(Boolean))] as string[]

  const taskCat = new Map<string, string>()
  const projCat = new Map<string, string>()

  if (taskIds.length > 0) {
    const { data } = await admin.from('tasks').select('id, category').in('id', taskIds)
    for (const t of data ?? []) if (t.category) taskCat.set(t.id as string, t.category as string)
  }
  if (projectIds.length > 0) {
    const { data } = await admin.from('projects').select('id, category').in('id', projectIds)
    for (const p of data ?? []) if (p.category) projCat.set(p.id as string, p.category as string)
  }

  const labelFor = (r: LedgerRow): { label: string; categoryKey: string | null } => {
    if (r.task_id && taskCat.has(r.task_id)) {
      const c = taskCat.get(r.task_id)!
      return { label: prettyCategory(c), categoryKey: c }
    }
    if (r.weekly_goal_id && projCat.has(r.weekly_goal_id)) {
      const c = projCat.get(r.weekly_goal_id)!
      return { label: prettyCategory(c), categoryKey: c }
    }
    const bucket =
      bucketFromDescription(r.description) ||
      (r.task_id ? 'Tasks' : r.weekly_goal_id ? 'Projects' : 'Other')
    return { label: bucket, categoryKey: null }
  }

  // Aggregate per user.
  type Agg = {
    points: number
    labelPoints: Map<string, number>
    labelKey: Map<string, string | null>
  }
  const byUser = new Map<string, Agg>()

  for (const r of ledger) {
    const agg = byUser.get(r.user_id) || {
      points: 0,
      labelPoints: new Map(),
      labelKey: new Map(),
    }
    agg.points += r.points
    const { label, categoryKey } = labelFor(r)
    agg.labelPoints.set(label, (agg.labelPoints.get(label) || 0) + r.points)
    agg.labelKey.set(label, categoryKey)
    byUser.set(r.user_id, agg)
  }

  const userIds = [...byUser.keys()]
  const names = new Map<string, string>()
  const { data: profiles } = await admin.from('profiles').select('id, name').in('id', userIds)
  for (const p of profiles ?? []) {
    const full = (p.name as string | null)?.trim()
    const first = full ? full.split(/\s+/)[0] : ''
    names.set(p.id as string, first || 'Member')
  }

  const ranked = userIds
    .map((uid) => {
      const agg = byUser.get(uid)!
      let topLabel = 'Other'
      let topKey: string | null = null
      let max = -1
      for (const [label, pts] of agg.labelPoints) {
        if (pts > max) {
          max = pts
          topLabel = label
          topKey = agg.labelKey.get(label) ?? null
        }
      }
      return {
        userId: uid,
        firstName: names.get(uid) || 'Member',
        points: agg.points,
        topLabel,
        topEmoji: topKey ? getProjectCategoryEmoji(topKey) : '✨',
      }
    })
    .sort((a, b) => b.points - a.points)
    .slice(0, limit)
    .map((r, i) => ({ ...r, rank: i + 1 }))

  return ranked
}
