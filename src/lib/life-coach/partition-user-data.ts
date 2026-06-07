type Timestamped = {
  updated_at?: string | null
  created_at?: string | null
  completed_at?: string | null
}

export function isTaskCompleted(task: {
  status?: string | null
  is_completed?: boolean | null
}): boolean {
  if (task.status === 'completed' || task.status === 'cancelled') return true
  return task.is_completed === true
}

export function isProjectCompleted(project: {
  is_completed?: boolean | null
  status?: string | null
}): boolean {
  if (project.is_completed === true) return true
  return project.status === 'completed' || project.status === 'cancelled'
}

/** Closed goals — completed or cancelled. Paused goals stay in the active bucket. */
export function isGoalClosed(goal: { status?: string | null }): boolean {
  return goal.status === 'completed' || goal.status === 'cancelled'
}

export function isPriorityCompleted(priority: { is_completed?: boolean | null }): boolean {
  return priority.is_completed === true
}

export function isEducationCompleted(item: {
  status?: string | null
  is_active?: boolean | null
}): boolean {
  if (item.status === 'completed') return true
  return item.is_active === false
}

function sortByRecency<T extends Timestamped>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.completed_at || a.updated_at || a.created_at || 0).getTime()
    const bTime = new Date(b.completed_at || b.updated_at || b.created_at || 0).getTime()
    return bTime - aTime
  })
}

export type CoachUserData = {
  goals: Array<Record<string, unknown>>
  projects: Array<Record<string, unknown>>
  tasks: Array<Record<string, unknown>>
  habits: Array<Record<string, unknown>>
  education: Array<Record<string, unknown>>
  priorities: Array<Record<string, unknown>>
  points: Array<Record<string, unknown>>
  weeks: Array<Record<string, unknown>>
  accomplishments: Array<Record<string, unknown>>
  activeModules: Array<{ module_id: string; last_accessed: string }>
  gratitudeEntries: Array<Record<string, unknown>>
}

export type PartitionedCoachContext = CoachUserData & {
  activeGoals: Array<Record<string, unknown>>
  closedGoals: Array<Record<string, unknown>>
  activeProjects: Array<Record<string, unknown>>
  completedProjects: Array<Record<string, unknown>>
  openTasks: Array<Record<string, unknown>>
  completedTasks: Array<Record<string, unknown>>
  activePriorities: Array<Record<string, unknown>>
  completedPriorities: Array<Record<string, unknown>>
  activeEducation: Array<Record<string, unknown>>
  completedEducation: Array<Record<string, unknown>>
}

export function partitionUserDataForCoach(raw: CoachUserData): PartitionedCoachContext {
  const activeGoals = sortByRecency(raw.goals.filter((g) => !isGoalClosed(g)))
  const closedGoals = sortByRecency(raw.goals.filter((g) => isGoalClosed(g)))

  const activeProjects = sortByRecency(raw.projects.filter((p) => !isProjectCompleted(p)))
  const completedProjects = sortByRecency(raw.projects.filter((p) => isProjectCompleted(p)))

  const openTasks = sortByRecency(raw.tasks.filter((t) => !isTaskCompleted(t)))
  const completedTasks = sortByRecency(raw.tasks.filter((t) => isTaskCompleted(t)))

  const activePriorities = sortByRecency(raw.priorities.filter((p) => !isPriorityCompleted(p)))
  const completedPriorities = sortByRecency(raw.priorities.filter((p) => isPriorityCompleted(p)))

  const activeEducation = sortByRecency(raw.education.filter((e) => !isEducationCompleted(e)))
  const completedEducation = sortByRecency(raw.education.filter((e) => isEducationCompleted(e)))

  return {
    ...raw,
    activeGoals,
    closedGoals,
    activeProjects,
    completedProjects,
    openTasks,
    completedTasks,
    activePriorities,
    completedPriorities,
    activeEducation,
    completedEducation,
  }
}

function labelForGoal(goal: Record<string, unknown>): string {
  const category = goal.category || goal.goal_type || 'general'
  const status = goal.status || 'active'
  return `- ${goal.title} (${category}, ${status})`
}

function labelForProject(project: Record<string, unknown>): string {
  const category = project.category || 'other'
  const progress =
    typeof project.target_points === 'number' &&
    Number(project.target_points) > 0 &&
    typeof project.current_points === 'number'
      ? `, ${Math.round((Number(project.current_points) / Number(project.target_points)) * 100)}% points`
      : ''
  return `- ${project.title} (${category}${progress})`
}

function labelForTask(task: Record<string, unknown>): string {
  const status = task.status || (task.is_completed ? 'completed' : 'pending')
  return `- ${task.title} (${status})`
}

export function formatCoachWorkContext(ctx: PartitionedCoachContext): string {
  const activeGoalLines = ctx.activeGoals.slice(0, 8).map(labelForGoal)
  const closedGoalLines = ctx.closedGoals.slice(0, 5).map(labelForGoal)
  const activeProjectLines = ctx.activeProjects.slice(0, 8).map(labelForProject)
  const completedProjectLines = ctx.completedProjects.slice(0, 5).map(labelForProject)
  const openTaskLines = ctx.openTasks.slice(0, 12).map(labelForTask)
  const completedTaskLines = ctx.completedTasks.slice(0, 5).map(labelForTask)

  return `
COMPLETION AWARENESS (critical):
- Recommend actions ONLY for ACTIVE goals, ACTIVE projects, and OPEN tasks below.
- Items under "COMPLETED / CLOSED" are past wins — celebrate briefly if relevant, but do NOT assign new work on them or treat them as current priorities.
- If the user asks about something already completed, acknowledge the win and pivot to what is still open.

ACTIVE GOALS (${ctx.activeGoals.length} total):
${activeGoalLines.length > 0 ? activeGoalLines.join('\n') : 'None — user may be between goal cycles.'}

COMPLETED / CLOSED GOALS (${ctx.closedGoals.length} total, recent):
${closedGoalLines.length > 0 ? closedGoalLines.join('\n') : 'None recorded.'}

ACTIVE PROJECTS (${ctx.activeProjects.length} total):
${activeProjectLines.length > 0 ? activeProjectLines.join('\n') : 'None — focus may be on goals, tasks, or habits.'}

COMPLETED PROJECTS (${ctx.completedProjects.length} total, recent):
${completedProjectLines.length > 0 ? completedProjectLines.join('\n') : 'None recorded.'}

OPEN TASKS (${ctx.openTasks.length} total):
${openTaskLines.length > 0 ? openTaskLines.join('\n') : 'None — inbox clear or work tracked elsewhere.'}

RECENTLY COMPLETED TASKS (${ctx.completedTasks.length} total, recent):
${completedTaskLines.length > 0 ? completedTaskLines.join('\n') : 'None recorded.'}

ACTIVE PRIORITIES (${ctx.activePriorities.length} total):
${
  ctx.activePriorities.length > 0
    ? ctx.activePriorities
        .slice(0, 5)
        .map((p) => `- ${p.title} (${p.priority_type || 'priority'})`)
        .join('\n')
    : 'None set.'
}

ACTIVE LEARNING (${ctx.activeEducation.length} total):
${
  ctx.activeEducation.length > 0
    ? ctx.activeEducation
        .slice(0, 5)
        .map((e) => `- ${e.title} (${e.status || 'in_progress'})`)
        .join('\n')
    : 'None in progress.'
}
`.trim()
}
