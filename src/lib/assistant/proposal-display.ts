import type { ActionProposalRow } from '@/lib/assistant/proposal-schemas'

export type DashboardSectionKey = 'goals' | 'projects' | 'tasks' | 'habits' | 'education'

export type ProposalDisplayModel = {
  sectionKey: DashboardSectionKey | 'completion'
  sectionTitle: string
  sectionHint: string
  headline: string
  details: Array<{ label: string; value: string }>
  confirmLabel: string
  isCompletion: boolean
}

const SECTION_META: Record<
  DashboardSectionKey,
  { title: string; hint: string; confirmPrefix: string }
> = {
  goals: {
    title: 'Goals',
    hint: 'Measurable targets in the Goals section of your dashboard.',
    confirmPrefix: 'Add to Goals',
  },
  projects: {
    title: 'Projects',
    hint: 'Work initiatives in the Projects section, linked to a goal when applicable.',
    confirmPrefix: 'Add to Projects',
  },
  tasks: {
    title: 'Tasks',
    hint: 'Action items in the Tasks section for this week.',
    confirmPrefix: 'Add to Tasks',
  },
  habits: {
    title: 'Habits',
    hint: 'Daily repeatable actions in the Habits section.',
    confirmPrefix: 'Add to Habits',
  },
  education: {
    title: 'Education',
    hint: 'Learning and certification goals in the Education section.',
    confirmPrefix: 'Add to Education',
  },
}

function str(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  const s = String(value).trim()
  return s.length ? s : undefined
}

function actionToSection(actionType: ActionProposalRow['action_type']): DashboardSectionKey {
  switch (actionType) {
    case 'create_goal':
      return 'goals'
    case 'create_project':
      return 'projects'
    case 'create_task':
    case 'complete_task':
      return 'tasks'
    case 'create_habit':
    case 'complete_habit':
      return 'habits'
    default:
      return 'tasks'
  }
}

export function buildProposalDisplayModel(
  actionType: ActionProposalRow['action_type'] | string,
  payload: Record<string, unknown>
): ProposalDisplayModel {
  if (actionType === 'complete_task') {
    return {
      sectionKey: 'tasks',
      sectionTitle: SECTION_META.tasks.title,
      sectionHint: 'This will mark the task complete on your dashboard.',
      headline: str(payload.title) || 'Task',
      details: [{ label: 'Action', value: 'Mark task as completed' }],
      confirmLabel: 'Mark task complete',
      isCompletion: true,
    }
  }

  if (actionType === 'complete_habit') {
    return {
      sectionKey: 'habits',
      sectionTitle: SECTION_META.habits.title,
      sectionHint: 'This will log the habit for today on your dashboard.',
      headline: str(payload.title) || 'Habit',
      details: [{ label: 'Action', value: "Log today's habit completion" }],
      confirmLabel: 'Log habit for today',
      isCompletion: true,
    }
  }

  if (actionType === 'create_education_item') {
    const meta = SECTION_META.education
    const details: Array<{ label: string; value: string }> = []
    const description = str(payload.description)
    const targetDate = str(payload.target_date)
    const priority = payload.priority_level
    if (description) details.push({ label: 'Description', value: description })
    if (targetDate) details.push({ label: 'Target date', value: targetDate })
    if (priority != null) details.push({ label: 'Priority', value: String(priority) })
    if (payload.points_value != null) {
      details.push({ label: 'Points', value: String(payload.points_value) })
    }
    return {
      sectionKey: 'education',
      sectionTitle: meta.title,
      sectionHint: meta.hint,
      headline: str(payload.title) || 'Education item',
      details,
      confirmLabel: meta.confirmPrefix,
      isCompletion: false,
    }
  }

  const section = actionToSection(actionType as ActionProposalRow['action_type'])
  const meta = SECTION_META[section]
  const details: Array<{ label: string; value: string }> = []

  if (actionType === 'create_goal') {
    const description = str(payload.description)
    if (description) details.push({ label: 'Description', value: description })
    if (payload.goal_type) details.push({ label: 'Goal type', value: String(payload.goal_type) })
    if (payload.target_value != null && payload.target_unit) {
      details.push({
        label: 'Target',
        value: `${payload.target_value} ${payload.target_unit}`,
      })
    }
    if (payload.priority_level != null) {
      details.push({ label: 'Priority', value: String(payload.priority_level) })
    }
    return {
      sectionKey: section,
      sectionTitle: meta.title,
      sectionHint: meta.hint,
      headline: str(payload.title) || 'Goal',
      details,
      confirmLabel: meta.confirmPrefix,
      isCompletion: false,
    }
  }

  if (actionType === 'create_project') {
    const description = str(payload.description)
    if (description) details.push({ label: 'Description', value: description })
    if (payload.category) details.push({ label: 'Category', value: String(payload.category) })
    const goalRef = str(payload.goal_title_ref)
    if (goalRef) details.push({ label: 'Linked goal', value: goalRef })
    else if (payload.goal_id)
      details.push({ label: 'Linked goal', value: 'Existing goal on dashboard' })
    if (payload.target_points != null) {
      details.push({ label: 'Target points', value: String(payload.target_points) })
    }
    return {
      sectionKey: section,
      sectionTitle: meta.title,
      sectionHint: meta.hint,
      headline: str(payload.title) || 'Project',
      details,
      confirmLabel: meta.confirmPrefix,
      isCompletion: false,
    }
  }

  if (actionType === 'create_task') {
    const description = str(payload.description)
    if (description) details.push({ label: 'Description', value: description })
    if (payload.category) details.push({ label: 'Category', value: String(payload.category) })
    const projectTitle = str(payload.project_title)
    if (projectTitle) details.push({ label: 'Project', value: projectTitle })
    if (payload.points_value != null) {
      details.push({ label: 'Points', value: String(payload.points_value) })
    }
    return {
      sectionKey: section,
      sectionTitle: meta.title,
      sectionHint: meta.hint,
      headline: str(payload.title) || 'Task',
      details,
      confirmLabel: meta.confirmPrefix,
      isCompletion: false,
    }
  }

  // create_habit (default)
  const habitMeta = SECTION_META.habits
  const description = str(payload.description)
  if (description) details.push({ label: 'Description', value: description })
  if (payload.points_per_completion != null) {
    details.push({ label: 'Points per completion', value: String(payload.points_per_completion) })
  }
  return {
    sectionKey: 'habits',
    sectionTitle: habitMeta.title,
    sectionHint: habitMeta.hint,
    headline: str(payload.title) || 'Habit',
    details,
    confirmLabel: habitMeta.confirmPrefix,
    isCompletion: false,
  }
}

export const DASHBOARD_SECTION_ORDER: DashboardSectionKey[] = [
  'goals',
  'projects',
  'tasks',
  'habits',
  'education',
]
