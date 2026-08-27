import {
  isGoalClosed,
  isProjectCompleted,
  isTaskCompleted,
} from '@/lib/life-coach/partition-user-data'
import {
  isLiabilityAccount,
  type BankAccountRow,
  type ManualAccountRow,
} from '@/lib/budget/net-worth-series'
import { netWorthChangeForPeriod } from '@/lib/budget/net-worth-period-change'
import { computeContextualEnergyLevel } from '@/lib/fitness/contextual-energy'

export type GreetingPeriod = 'morning' | 'afternoon' | 'evening'

export type GlancePlanItem = {
  id: string
  title: string
  timeLabel: string | null
  done: boolean
  kind: 'task' | 'priority'
}

export type GlanceHealth = {
  heartLabel: string | null
  heartValue: number | null
  sleepLabel: string | null
  steps: number | null
  readiness: number | null
  sparkline: number[]
}

export type GlanceFinance = {
  netWorth: number | null
  monthChangePct: number | null
  investments: number | null
  cash: number | null
}

export type GlanceUpcomingItem = {
  id: string
  title: string
  dateLabel: string
  dateIso: string
  kind: 'goal' | 'project'
}

export type GlanceFocus = {
  title: string
  percent: number
  nextStep: string | null
}

export function greetingForHour(hour: number): GreetingPeriod {
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

export function firstNameFromDisplay(fullName?: string | null, email?: string | null): string {
  const fromName = (fullName || '').trim().split(/\s+/)[0]
  if (fromName) return fromName
  const local = (email || '').split('@')[0]?.trim()
  if (local) {
    const token = local.split(/[._-]/)[0] || local
    return token.charAt(0).toUpperCase() + token.slice(1)
  }
  return 'there'
}

export function formatSleepHours(hours: number): string {
  if (!Number.isFinite(hours) || hours < 0) return ''
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (m <= 0) return `${h}h`
  if (m === 60) return `${h + 1}h`
  return `${h}h ${m}m`
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCompactDate(iso: string): string {
  const value = iso.includes('T') ? iso : `${iso}T12:00:00`
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function isCashAccount(acc: { type?: string | null; subtype?: string | null }): boolean {
  const type = (acc.type || '').toLowerCase()
  const subtype = (acc.subtype || '').toLowerCase()
  if (type === 'depository') return true
  return ['checking', 'savings', 'money market', 'cd', 'cash management'].some((label) =>
    subtype.includes(label)
  )
}

export function isInvestmentAccount(acc: {
  type?: string | null
  subtype?: string | null
}): boolean {
  const type = (acc.type || '').toLowerCase()
  const subtype = (acc.subtype || '').toLowerCase()
  if (type === 'investment' || type === 'brokerage') return true
  return ['brokerage', '401k', '403b', 'ira', 'investment', 'mutual', 'stock'].some((label) =>
    subtype.includes(label)
  )
}

export function computeAccountTotals(
  bankAccounts: BankAccountRow[],
  manualAccounts: ManualAccountRow[]
): GlanceFinance {
  let cash = 0
  let investments = 0
  let netWorth = 0

  for (const account of bankAccounts) {
    const balance = Number(account.current_balance) || 0
    if (isLiabilityAccount(account)) {
      netWorth -= Math.max(balance, 0)
      continue
    }
    netWorth += balance
    if (isInvestmentAccount(account)) investments += balance
    else if (isCashAccount(account)) cash += balance
    else cash += balance
  }

  for (const account of manualAccounts) {
    const amount = Number(account.amount) || 0
    if (account.account_type === 'loan' || amount < 0) {
      netWorth -= Math.abs(amount)
      continue
    }
    netWorth += amount
    if (account.account_type === 'investment') investments += amount
    else cash += amount
  }

  const hasAny = bankAccounts.length > 0 || manualAccounts.length > 0
  return {
    netWorth: hasAny ? Math.round(netWorth) : null,
    monthChangePct: null,
    investments: hasAny ? Math.round(investments) : null,
    cash: hasAny ? Math.round(cash) : null,
  }
}

export function attachMonthChange(
  finance: GlanceFinance,
  points: Array<{ date: string; netWorth: number }>,
  todayIso: string
): GlanceFinance {
  if (points.length === 0) return finance
  const today = new Date(`${todayIso}T12:00:00Z`)
  const start = new Date(today)
  start.setUTCDate(start.getUTCDate() - 30)
  const startIso = start.toISOString().slice(0, 10)
  const change = netWorthChangeForPeriod(points, startIso, todayIso)
  return {
    ...finance,
    monthChangePct: change.changePct == null ? null : Math.round(change.changePct * 10) / 10,
  }
}

function priorityBand(priority: unknown): 0 | 1 | 2 {
  const value = typeof priority === 'string' ? priority.toLowerCase() : ''
  if (value === 'high') return 0
  if (value === 'low') return 2
  return 1
}

function taskRank(priority: unknown, sortOrder: unknown): number {
  const band = priorityBand(priority)
  const order = typeof sortOrder === 'number' ? sortOrder : 0
  // Lower rank first: high band, then higher dashboard sort_order (top of list).
  return band * 1_000_000 - order
}

export function selectTodayPlan(
  tasks: Array<Record<string, unknown>>,
  priorities: Array<Record<string, unknown>> = [],
  now = new Date(),
  limit = 4
): { items: GlancePlanItem[]; remaining: number; total: number; completedToday: number } {
  const openTasks = tasks.filter((task) => !isTaskCompleted(task))
  const completedToday = tasks.filter((task) => {
    if (!isTaskCompleted(task)) return false
    const completedAt = typeof task.completed_at === 'string' ? task.completed_at : null
    if (!completedAt) return false
    const day = new Date(completedAt)
    return (
      day.getFullYear() === now.getFullYear() &&
      day.getMonth() === now.getMonth() &&
      day.getDate() === now.getDate()
    )
  }).length

  const highTasks = openTasks.filter((task) => priorityBand(task.priority) === 0)
  const pool = highTasks.length > 0 ? highTasks : openTasks
  const ranked = [...pool].sort(
    (a, b) => taskRank(a.priority, a.sort_order) - taskRank(b.priority, b.sort_order)
  )

  const items: GlancePlanItem[] = ranked.slice(0, limit).map((task) => ({
    id: String(task.id || ''),
    title: String(task.title || 'Untitled task'),
    timeLabel: null,
    done: false,
    kind: 'task',
  }))

  if (items.length === 0) {
    const openPriorities = priorities.filter(
      (priority) => priority.is_deleted !== true && priority.is_completed !== true
    )
    for (const priority of openPriorities.slice(0, limit)) {
      items.push({
        id: String(priority.id || ''),
        title: String(priority.title || 'Priority'),
        timeLabel: null,
        done: false,
        kind: 'priority',
      })
    }
  }

  const remaining = items.some((item) => item.kind === 'priority') ? items.length : openTasks.length
  const total = remaining + completedToday
  return { items, remaining, total, completedToday }
}

function upcomingDate(row: Record<string, unknown>): string | null {
  for (const key of ['target_date', 'deadline', 'due_date']) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

export function selectUpcoming(
  goals: Array<Record<string, unknown>>,
  projects: Array<Record<string, unknown>>,
  now = new Date(),
  limit = 3
): GlanceUpcomingItem[] {
  const today = now.toISOString().slice(0, 10)
  const rows: GlanceUpcomingItem[] = []

  for (const goal of goals) {
    if (isGoalClosed(goal)) continue
    const date = upcomingDate(goal)
    if (!date || date.slice(0, 10) < today) continue
    rows.push({
      id: String(goal.id || `goal-${rows.length}`),
      title: String(goal.title || 'Goal'),
      dateLabel: formatCompactDate(date),
      dateIso: date.slice(0, 10),
      kind: 'goal',
    })
  }

  for (const project of projects) {
    if (isProjectCompleted(project)) continue
    const date = upcomingDate(project)
    if (!date || date.slice(0, 10) < today) continue
    rows.push({
      id: String(project.id || `project-${rows.length}`),
      title: String(project.title || 'Project'),
      dateLabel: formatCompactDate(date),
      dateIso: date.slice(0, 10),
      kind: 'project',
    })
  }

  return rows.sort((a, b) => a.dateIso.localeCompare(b.dateIso)).slice(0, limit)
}

export function selectTopFocus(
  goals: Array<Record<string, unknown>>,
  projects: Array<Record<string, unknown>>,
  tasks: Array<Record<string, unknown>>
): GlanceFocus | null {
  const activeGoals = goals.filter((goal) => !isGoalClosed(goal))
  const activeProjects = projects.filter((project) => !isProjectCompleted(project))

  const scored = [
    ...activeGoals.map((goal) => {
      const current = Number(goal.current_value) || 0
      const target = Number(goal.target_value) || 0
      const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
      return {
        title: String(goal.title || 'Goal'),
        percent,
        priority: typeof goal.priority_level === 'number' ? goal.priority_level : 3,
        id: String(goal.id || ''),
        kind: 'goal' as const,
      }
    }),
    ...activeProjects.map((project) => {
      const current = Number(project.current_points) || 0
      const target = Number(project.target_points) || 0
      const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
      return {
        title: String(project.title || 'Project'),
        percent,
        priority: 3,
        id: String(project.id || ''),
        kind: 'project' as const,
      }
    }),
  ].sort((a, b) => b.priority - a.priority || b.percent - a.percent)

  const top = scored[0]
  if (!top) return null

  const nextTask = tasks.find((task) => {
    if (isTaskCompleted(task)) return false
    if (top.kind === 'project') return String(task.weekly_goal_id || '') === top.id
    return true
  })

  return {
    title: top.title,
    percent: top.percent,
    nextStep: nextTask ? String(nextTask.title) : null,
  }
}

export function computeHealthGlance(
  biometrics: Array<{
    sleep_hours?: number | null
    resting_heart_rate?: number | null
    steps?: number | null
    energy_level_self_1_10?: number | null
    contextual_energy_level_1_10?: number | null
    stress_level_1_10?: number | null
    recorded_at?: string
    sync_date?: string | null
  }>
): GlanceHealth {
  const latest = biometrics[0]
  if (!latest) {
    return {
      heartLabel: null,
      heartValue: null,
      sleepLabel: null,
      steps: null,
      readiness: null,
      sparkline: [],
    }
  }

  const energy =
    latest.contextual_energy_level_1_10 ??
    computeContextualEnergyLevel(latest).contextual_energy_level_1_10

  const sparkline = [...biometrics]
    .slice(0, 14)
    .reverse()
    .map((row) => row.steps || row.contextual_energy_level_1_10 || row.energy_level_self_1_10 || 0)

  return {
    heartLabel: typeof latest.resting_heart_rate === 'number' ? 'RHR' : null,
    heartValue: typeof latest.resting_heart_rate === 'number' ? latest.resting_heart_rate : null,
    sleepLabel:
      typeof latest.sleep_hours === 'number' ? formatSleepHours(latest.sleep_hours) : null,
    steps: typeof latest.steps === 'number' ? latest.steps : null,
    readiness: energy * 10,
    sparkline,
  }
}

export function composeAiInsight(input: {
  health: GlanceHealth
  remainingTasks: number
  focusTitle: string | null
  hasFinance: boolean
}): string {
  const parts: string[] = []
  const sleepOk =
    Boolean(input.health.sleepLabel) &&
    !input.health.sleepLabel!.startsWith('0h') &&
    !input.health.sleepLabel!.startsWith('1h') &&
    !input.health.sleepLabel!.startsWith('2h') &&
    !input.health.sleepLabel!.startsWith('3h') &&
    !input.health.sleepLabel!.startsWith('4h') &&
    !input.health.sleepLabel!.startsWith('5h')
  const stepsOk = (input.health.steps || 0) >= 7000
  const energyUp = (input.health.readiness || 0) >= 70

  if (sleepOk && stepsOk) {
    parts.push("You've been sleeping well and hitting your step goal.")
  } else if (sleepOk) {
    parts.push("You've been sleeping well — keep protecting that rest.")
  } else if (stepsOk) {
    parts.push("You're moving consistently and hitting your step goal.")
  }

  if (energyUp) {
    parts.push('Energy looks strong this week. Keep it up!')
  }

  if (input.focusTitle) {
    parts.push(`Stay close to your top focus: ${input.focusTitle}.`)
  }

  if (input.remainingTasks > 0) {
    parts.push('Consider blocking focus time tomorrow morning.')
  } else if (parts.length === 0) {
    parts.push(
      input.hasFinance
        ? 'Your stacks are quiet today. Add a task or open Fitness Tracker to fill in Today at a Glance.'
        : 'Start by adding a few tasks, then install Stacks like Fitness Tracker and Budget Master to bring this homepage to life.'
    )
  }

  return parts.join(' ')
}
