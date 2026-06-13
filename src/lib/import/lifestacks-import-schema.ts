/** Shared schema for LifeStacks dashboard import (Excel / CSV / ChatGPT output). */

export const LIFESTACKS_IMPORT_CATEGORIES = [
  'quick_money',
  'save_money',
  'health',
  'network_expansion',
  'business_growth',
  'fires',
  'good_living',
  'big_vision',
  'job',
  'organization',
  'tech_issues',
  'business_launch',
  'future_planning',
  'innovation',
  'productivity',
  'learning',
  'financial',
  'personal',
  'other',
] as const

export type LifestacksImportCategory = (typeof LIFESTACKS_IMPORT_CATEGORIES)[number]

export interface LifestacksImportGoal {
  title: string
  description: string
  goal_type: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  target_value?: number
  target_unit?: string
  priority_level: number
  target_date?: string
  status: 'active' | 'completed' | 'paused' | 'cancelled'
}

export interface LifestacksImportProject {
  title: string
  description: string
  category: LifestacksImportCategory
  target_points: number
  target_money: number
  linked_goal_title?: string
  deadline?: string
}

export interface LifestacksImportTask {
  title: string
  description: string
  project_title: string
  points_value: number
  money_value: number
  priority: 'low' | 'medium' | 'high'
  estimated_time?: string
}

export interface LifestacksImportHabit {
  title: string
  description: string
  points_per_completion: number
  is_active: boolean
}

export interface LifestacksImportEducation {
  title: string
  description: string
  points_value: number
  cost?: number
  priority_level: number
  status: 'pending' | 'in_progress' | 'completed'
  target_date?: string
}

export interface LifestacksImportPayload {
  goals: LifestacksImportGoal[]
  projects: LifestacksImportProject[]
  tasks: LifestacksImportTask[]
  habits: LifestacksImportHabit[]
  education: LifestacksImportEducation[]
}

export function normalizeCategory(value: unknown): LifestacksImportCategory {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
  if ((LIFESTACKS_IMPORT_CATEGORIES as readonly string[]).includes(raw)) {
    return raw as LifestacksImportCategory
  }
  return 'other'
}

export function normalizePriority(value: unknown): 'low' | 'medium' | 'high' {
  const p = String(value ?? 'medium').toLowerCase()
  return p === 'low' || p === 'high' ? p : 'medium'
}

export function parseBool(value: unknown, defaultValue = true): boolean {
  if (value === undefined || value === null || value === '') return defaultValue
  const s = String(value).trim().toLowerCase()
  return s === 'true' || s === '1' || s === 'yes' || s === 'y'
}

export function parseNumber(value: unknown, defaultValue = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : defaultValue
}

function rowHasData(row: unknown[] | undefined): boolean {
  return Boolean(row?.some((cell) => String(cell ?? '').trim()))
}

function sheetRows(sheet: unknown): unknown[][] {
  if (!sheet || typeof sheet !== 'object') return []
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx') as typeof import('xlsx')
  const data = XLSX.utils.sheet_to_json(sheet as import('xlsx').WorkSheet, { header: 1 })
  return (data as unknown[][]).slice(1)
}

function headerMap(sheet: unknown): Record<string, number> {
  if (!sheet || typeof sheet !== 'object') return {}
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx') as typeof import('xlsx')
  const rows = XLSX.utils.sheet_to_json(sheet as import('xlsx').WorkSheet, {
    header: 1,
  }) as unknown[][]
  const headers = (rows[0] || []).map((h) =>
    String(h ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
  )
  const map: Record<string, number> = {}
  headers.forEach((h, i) => {
    if (h) map[h] = i
  })
  return map
}

function cell(row: unknown[], map: Record<string, number>, key: string): unknown {
  const idx = map[key]
  if (idx === undefined) return undefined
  return row[idx]
}

export function parseGoalsSheet(sheet: unknown): LifestacksImportGoal[] {
  const map = headerMap(sheet)
  const goals: LifestacksImportGoal[] = []
  for (const row of sheetRows(sheet)) {
    if (!rowHasData(row)) continue
    const title = String(cell(row, map, 'title') ?? '').trim()
    if (!title) continue
    const goalType = String(cell(row, map, 'goal_type') ?? 'monthly').toLowerCase()
    const validType =
      goalType === 'weekly' ||
      goalType === 'monthly' ||
      goalType === 'quarterly' ||
      goalType === 'yearly'
        ? goalType
        : 'monthly'
    const statusRaw = String(cell(row, map, 'status') ?? 'active').toLowerCase()
    const status =
      statusRaw === 'completed' ||
      statusRaw === 'paused' ||
      statusRaw === 'cancelled' ||
      statusRaw === 'active'
        ? statusRaw
        : 'active'
    goals.push({
      title,
      description: String(cell(row, map, 'description') ?? '').trim(),
      goal_type: validType,
      target_value: parseNumber(cell(row, map, 'target_value'), 0) || undefined,
      target_unit: String(cell(row, map, 'target_unit') ?? '').trim() || undefined,
      priority_level: Math.min(5, Math.max(1, parseNumber(cell(row, map, 'priority_level'), 3))),
      target_date: String(cell(row, map, 'target_date') ?? '').trim() || undefined,
      status,
    })
  }
  return goals
}

export function parseProjectsSheet(sheet: unknown): LifestacksImportProject[] {
  const map = headerMap(sheet)
  const projects: LifestacksImportProject[] = []
  for (const row of sheetRows(sheet)) {
    if (!rowHasData(row)) continue
    const title = String(cell(row, map, 'title') ?? '').trim()
    if (!title) continue
    projects.push({
      title,
      description: String(cell(row, map, 'description') ?? '').trim(),
      category: normalizeCategory(cell(row, map, 'category')),
      target_points: parseNumber(cell(row, map, 'target_points'), 100),
      target_money: parseNumber(cell(row, map, 'target_money'), 0),
      linked_goal_title: String(cell(row, map, 'linked_goal_title') ?? '').trim() || undefined,
      deadline: String(cell(row, map, 'deadline') ?? '').trim() || undefined,
    })
  }
  return projects
}

export function parseTasksSheet(sheet: unknown): LifestacksImportTask[] {
  const map = headerMap(sheet)
  const tasks: LifestacksImportTask[] = []
  for (const row of sheetRows(sheet)) {
    if (!rowHasData(row)) continue
    const title = String(cell(row, map, 'title') ?? '').trim()
    if (!title) continue
    tasks.push({
      title,
      description: String(cell(row, map, 'description') ?? '').trim(),
      project_title: String(cell(row, map, 'project_title') ?? '').trim(),
      points_value: parseNumber(cell(row, map, 'points_value') ?? cell(row, map, 'points'), 10),
      money_value: parseNumber(cell(row, map, 'money_value'), 0),
      priority: normalizePriority(cell(row, map, 'priority')),
      estimated_time: String(cell(row, map, 'estimated_time') ?? '').trim() || undefined,
    })
  }
  return tasks
}

export function parseHabitsSheet(sheet: unknown): LifestacksImportHabit[] {
  const map = headerMap(sheet)
  const habits: LifestacksImportHabit[] = []
  for (const row of sheetRows(sheet)) {
    if (!rowHasData(row)) continue
    const title = String(cell(row, map, 'title') ?? '').trim()
    if (!title) continue
    habits.push({
      title,
      description: String(cell(row, map, 'description') ?? '').trim(),
      points_per_completion: parseNumber(
        cell(row, map, 'points_per_completion') ?? cell(row, map, 'points_value'),
        25
      ),
      is_active: parseBool(cell(row, map, 'is_active'), true),
    })
  }
  return habits
}

export function parseEducationSheet(sheet: unknown): LifestacksImportEducation[] {
  const map = headerMap(sheet)
  const education: LifestacksImportEducation[] = []
  for (const row of sheetRows(sheet)) {
    if (!rowHasData(row)) continue
    const title = String(cell(row, map, 'title') ?? '').trim()
    if (!title) continue
    const statusRaw = String(cell(row, map, 'status') ?? 'pending').toLowerCase()
    const status =
      statusRaw === 'in_progress' || statusRaw === 'completed' || statusRaw === 'pending'
        ? statusRaw
        : 'pending'
    education.push({
      title,
      description: String(cell(row, map, 'description') ?? '').trim(),
      points_value: parseNumber(cell(row, map, 'points_value'), 100),
      cost: parseNumber(cell(row, map, 'cost'), 0) || undefined,
      priority_level: Math.min(5, Math.max(1, parseNumber(cell(row, map, 'priority_level'), 3))),
      status,
      target_date: String(cell(row, map, 'target_date') ?? '').trim() || undefined,
    })
  }
  return education
}

export function parseLifestacksWorkbook(
  workbook: import('xlsx').WorkBook
): LifestacksImportPayload {
  const sheet = (name: string) => workbook.Sheets[name]
  const projectsFromProjects = parseProjectsSheet(sheet('Projects') ?? sheet('projects'))
  const projectsFromLegacyGoals = parseProjectsSheet(sheet('Goals') ?? sheet('goals'))

  return {
    goals: parseGoalsSheet(
      sheet('LifeGoals') ??
        sheet('life_goals') ??
        sheet('HighLevelGoals') ??
        sheet('high_level_goals')
    ),
    projects: projectsFromProjects.length > 0 ? projectsFromProjects : projectsFromLegacyGoals,
    tasks: parseTasksSheet(sheet('Tasks') ?? sheet('tasks')),
    habits: parseHabitsSheet(sheet('Habits') ?? sheet('habits')),
    education: parseEducationSheet(sheet('Education') ?? sheet('education')),
  }
}
