import { isGoalClosed, isProjectCompleted } from '../life-coach/partition-user-data'

export type DashboardContextItem = {
  id?: string
  kind: 'project' | 'goal'
  title: string
  description?: string
  priority_level?: number
  target_date?: string
}

function priorityFromProject(priority: unknown): number {
  if (priority === 'high') return 5
  if (priority === 'low') return 1
  return 3
}

export function activeDashboardContextFromRows(
  projects: Array<Record<string, unknown>> = [],
  goals: Array<Record<string, unknown>> = []
): DashboardContextItem[] {
  const items: DashboardContextItem[] = []

  for (const project of projects) {
    if (isProjectCompleted(project)) continue
    items.push({
      id: typeof project.id === 'string' ? project.id : undefined,
      kind: 'project',
      title: String(project.title || 'Project'),
      description: typeof project.description === 'string' ? project.description : undefined,
      priority_level: priorityFromProject(project.priority),
      target_date:
        typeof project.deadline === 'string'
          ? project.deadline
          : typeof project.target_date === 'string'
            ? project.target_date
            : undefined,
    })
  }

  for (const goal of goals) {
    if (isGoalClosed(goal)) continue
    items.push({
      id: typeof goal.id === 'string' ? goal.id : undefined,
      kind: 'goal',
      title: String(goal.title || 'Goal'),
      description: typeof goal.description === 'string' ? goal.description : undefined,
      priority_level: typeof goal.priority_level === 'number' ? goal.priority_level : undefined,
      target_date: typeof goal.target_date === 'string' ? goal.target_date : undefined,
    })
  }

  return items.sort((a, b) => (b.priority_level ?? 3) - (a.priority_level ?? 3))
}

export function summarizeDashboardContextForAi(items: DashboardContextItem[]): string {
  if (items.length === 0) return 'None — user has no active dashboard projects or goals.'

  return JSON.stringify(
    items.slice(0, 15).map((item) => ({
      kind: item.kind,
      title: item.title,
      description: item.description,
      priority: item.priority_level,
      target_date: item.target_date,
    })),
    null,
    2
  )
}
