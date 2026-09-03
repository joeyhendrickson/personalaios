import 'server-only'

import { taskCategorySchema } from '@/lib/assistant/proposal-schemas'
import { DREAM_CATCHER_LIMITS } from '@/lib/dream-catcher/plan-limits'
import type {
  DreamCatcherAssessmentInput,
  OnboardingPlan,
  OnboardingPlanItem,
} from '@/lib/dream-catcher/generate-onboarding-plan'

export type ProjectIdea = {
  title: string
  description?: string
  category?: string
  linked_goal?: string
}

export type TaskIdea = {
  title: string
  description?: string
  category?: string
  linked_project?: string
  step_order?: number
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

function sanitizeCategory(category?: string): string {
  if (!category) return 'other'
  const c = category
    .toLowerCase()
    .replace(/[^a-z]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return c.length ? c : 'other'
}

export { sanitizeCategory as sanitizeProjectCategory }

export function sanitizeTaskCategory(category?: string) {
  if (!category) return 'other' as const
  const c = category
    .toLowerCase()
    .trim()
    .replace(/[^a-z]+/g, '_')
    .replace(/^_+|_+$/g, '')
  const parsed = taskCategorySchema.safeParse(c)
  return parsed.success ? parsed.data : ('other' as const)
}

/** True when a project title is essentially the same as (or a wrapper around) a goal title. */
export function isProjectDuplicateOfGoal(projectTitle: string, goalTitle: string): boolean {
  const p = norm(projectTitle)
  const g = norm(goalTitle)
  if (!p || !g) return false
  if (p === g) return true
  if (p.includes(g) && p.length <= g.length + 24) return true
  if (g.includes(p) && p.length >= g.length * 0.85) return true
  const kickstart = norm(`kickstart: ${goalTitle}`)
  if (p === kickstart || p.startsWith(`kickstart: ${g}`)) return true
  const wordsP = new Set(p.split(' ').filter((w) => w.length > 3))
  const wordsG = new Set(g.split(' ').filter((w) => w.length > 3))
  if (wordsG.size === 0) return false
  let overlap = 0
  for (const w of wordsG) if (wordsP.has(w)) overlap++
  return overlap / wordsG.size >= 0.85 && Math.abs(p.length - g.length) < 15
}

export function resolveLinkedGoalTitle(
  linkedGoal: string | undefined,
  goalTitles: string[]
): string | undefined {
  if (!linkedGoal?.trim() || goalTitles.length === 0) return goalTitles[0]
  const key = norm(linkedGoal)
  const exact = goalTitles.find((t) => norm(t) === key)
  if (exact) return exact
  const partial = goalTitles.find((t) => norm(t).includes(key) || key.includes(norm(t)))
  return partial ?? goalTitles[0]
}

const MILESTONE_TEMPLATES: Record<string, string[]> = {
  business: [
    'Validate the approach and audience',
    'Build initial pipeline and outreach',
    'Deliver first measurable win',
  ],
  health: [
    'Establish baseline and weekly routine',
    'Build consistency for 4 weeks',
    'Hit first measurable checkpoint',
  ],
  fitness: [
    'Set baseline and schedule',
    'Build the weekly training habit',
    'Reach first performance checkpoint',
  ],
  financial: [
    'Clarify numbers and target',
    'Automate or track weekly progress',
    'Hit first savings or income milestone',
  ],
  learning: [
    'Choose curriculum and schedule',
    'Complete first learning block',
    'Apply what you learned in practice',
  ],
  personal: [
    'Define the first concrete step',
    'Build weekly momentum',
    'Complete first milestone review',
  ],
  career: [
    'Update materials and positioning',
    'Take targeted outreach actions',
    'Land first outcome milestone',
  ],
  other: [
    'Clarify scope and first step',
    'Execute the first work block',
    'Review progress and adjust',
  ],
}

function inferMilestonesForGoal(goalTitle: string, category?: string, count = 1): ProjectIdea[] {
  const cat = sanitizeCategory(category)
  const templates = MILESTONE_TEMPLATES[cat] ?? MILESTONE_TEMPLATES.other
  return templates.slice(0, count).map((title) => ({
    title,
    description: `Milestone toward "${goalTitle}" — a focused step that adds up to the larger goal, not the goal itself.`,
    category: cat,
    linked_goal: goalTitle,
  }))
}

export function intakeProjectIdeas(input: DreamCatcherAssessmentInput): ProjectIdea[] {
  return (input.projectIdeas ?? [])
    .filter((p) => p?.title?.trim())
    .map((p) => ({
      title: p.title.trim(),
      description: p.description?.trim(),
      category: p.category,
      linked_goal: p.linked_goal?.trim(),
    }))
}

function projectItemsFromIdeas(ideas: ProjectIdea[], goalTitles: string[]): OnboardingPlanItem[] {
  const items: OnboardingPlanItem[] = []
  const usedTitles = new Set<string>()

  for (const idea of ideas) {
    if (items.length >= DREAM_CATCHER_LIMITS.projects.max) break
    const title = idea.title.slice(0, 255)
    const titleKey = norm(title)
    if (usedTitles.has(titleKey)) continue

    const linkedGoal = resolveLinkedGoalTitle(idea.linked_goal, goalTitles)
    if (!linkedGoal) continue
    if (isProjectDuplicateOfGoal(title, linkedGoal)) continue

    usedTitles.add(titleKey)
    items.push({
      type: 'create_project',
      title,
      description:
        idea.description ||
        `Milestone project supporting "${linkedGoal}" — captured from your Dream Catcher intake.`,
      goal_title_ref: linkedGoal,
      category: sanitizeCategory(idea.category),
      target_points: 20,
      priority: 'medium',
    })
  }

  return items
}

export function resolveLinkedProjectTitle(
  linkedProject: string | undefined,
  projectTitles: string[]
): string | undefined {
  if (!linkedProject?.trim() || projectTitles.length === 0) return projectTitles[0]
  const key = norm(linkedProject)
  const exact = projectTitles.find((t) => norm(t) === key)
  if (exact) return exact
  const partial = projectTitles.find((t) => norm(t).includes(key) || key.includes(norm(t)))
  return partial ?? projectTitles[0]
}

/** True when a task title restates a goal or project instead of being a concrete step. */
export function isTaskDuplicateOfGoalOrProject(
  taskTitle: string,
  goalTitles: string[],
  projectTitles: string[]
): boolean {
  const t = norm(taskTitle)
  if (!t || t.length < 3) return true
  if (t.startsWith('first action for') || t.startsWith('define the first step')) return true

  for (const g of goalTitles) {
    if (isProjectDuplicateOfGoal(taskTitle, g)) return true
  }
  for (const p of projectTitles) {
    const pn = norm(p)
    if (t === pn) return true
    if (t.includes(pn) && t.length <= pn.length + 20) return true
  }
  return false
}

export function intakeTaskIdeas(input: DreamCatcherAssessmentInput): TaskIdea[] {
  return (input.taskIdeas ?? [])
    .filter((t) => t?.title?.trim())
    .map((t) => ({
      title: t.title.trim(),
      description: t.description?.trim(),
      category: t.category,
      linked_project: (t as TaskIdea).linked_project?.trim(),
      step_order:
        typeof (t as TaskIdea).step_order === 'number' ? (t as TaskIdea).step_order : undefined,
    }))
    .sort((a, b) => (a.step_order ?? 999) - (b.step_order ?? 999))
}

const TACTICAL_TEMPLATES = [
  {
    title: 'Define scope and success criteria',
    description: 'Clarify what done looks like for this milestone.',
  },
  {
    title: 'Gather resources and tools needed',
    description: 'List what you need before executing.',
  },
  {
    title: 'Complete the first work session',
    description: 'Block time and take the first concrete action.',
  },
  {
    title: 'Review progress and adjust',
    description: 'Check what worked, what blocked you, and update the plan.',
  },
]

function inferTasksForProject(projectTitle: string, count = 1): TaskIdea[] {
  return TACTICAL_TEMPLATES.slice(0, count).map((t, i) => ({
    title: `${t.title} — ${projectTitle}`.slice(0, 255),
    description: `${t.description} Supports project: "${projectTitle}".`,
    linked_project: projectTitle,
    step_order: i + 1,
    category: 'other',
  }))
}

function taskItemsFromIdeas(
  ideas: TaskIdea[],
  projectTitles: string[],
  goalTitles: string[]
): Extract<OnboardingPlanItem, { type: 'create_task' }>[] {
  const items: Extract<OnboardingPlanItem, { type: 'create_task' }>[] = []
  const usedTitles = new Set<string>()

  for (const task of ideas) {
    if (items.length >= DREAM_CATCHER_LIMITS.tasks.max) break

    const title = task.title.slice(0, 255)
    const titleKey = norm(title)
    if (usedTitles.has(titleKey)) continue

    const projectTitle = resolveLinkedProjectTitle(task.linked_project, projectTitles)
    if (!projectTitle) continue
    if (isTaskDuplicateOfGoalOrProject(title, goalTitles, projectTitles)) continue

    usedTitles.add(titleKey)
    items.push({
      type: 'create_task',
      title,
      description:
        task.description ||
        `Tactical step for "${projectTitle}" — captured from your Dream Catcher intake.`,
      project_title: projectTitle,
      category: sanitizeTaskCategory(task.category),
      points_value: 5,
    })
  }

  return items
}

/** Build goal → projects → tasks from intake data (fallback path). */
export function buildHierarchyFromIntake(input: DreamCatcherAssessmentInput): OnboardingPlanItem[] {
  const seeds = (input.seedGoals ?? [])
    .filter((g) => g?.goal)
    .slice(0, DREAM_CATCHER_LIMITS.goals.max)
  const usableSeeds = seeds.length
    ? seeds
    : [{ goal: 'Build momentum on my top priority', category: 'personal' }]

  const items: OnboardingPlanItem[] = []
  const goalTitles: string[] = []

  for (const seed of usableSeeds) {
    const goalTitle = seed.goal.slice(0, 255)
    goalTitles.push(goalTitle)

    const metric =
      seed.target_value != null && seed.target_unit
        ? `Measured by ${seed.target_value} ${seed.target_unit}`
        : seed.timeline
          ? `Timeline: ${seed.timeline}`
          : null

    items.push({
      type: 'create_goal',
      title: goalTitle,
      description:
        seed.description?.trim() ||
        (metric
          ? `${metric}. From your Dream Catcher intake.`
          : input.visionStatement
            ? `Supports your vision — focused on "${goalTitle}".`
            : 'Created from your Dream Catcher session.'),
      goal_type: 'monthly',
      target_value: seed.target_value ?? 1,
      target_unit: seed.target_unit ?? 'milestone',
      priority_level: seed.priority === 'high' ? 5 : seed.priority === 'low' ? 2 : 3,
    })
  }

  let projectIdeas = intakeProjectIdeas(input)
  const projectsByGoal = new Map<string, number>()
  for (const g of goalTitles) projectsByGoal.set(norm(g), 0)
  for (const p of projectIdeas) {
    const lg = resolveLinkedGoalTitle(p.linked_goal, goalTitles)
    if (lg) projectsByGoal.set(norm(lg), (projectsByGoal.get(norm(lg)) ?? 0) + 1)
  }

  for (const seed of usableSeeds) {
    const goalTitle = seed.goal.slice(0, 255)
    const count = projectsByGoal.get(norm(goalTitle)) ?? 0
    if (count >= 1) continue
    const needed = Math.min(2, DREAM_CATCHER_LIMITS.projects.max - projectIdeas.length)
    if (needed <= 0) break
    projectIdeas = [...projectIdeas, ...inferMilestonesForGoal(goalTitle, seed.category, needed)]
  }

  const projectItems = projectItemsFromIdeas(
    projectIdeas.slice(0, DREAM_CATCHER_LIMITS.projects.max),
    goalTitles
  )
  items.push(...projectItems)

  const projectTitles = projectItems
    .map((p) => (p.type === 'create_project' ? p.title : ''))
    .filter(Boolean)
  let taskIdeas = intakeTaskIdeas(input)
  const tasksByProject = new Map<string, number>()
  for (const pt of projectTitles) tasksByProject.set(norm(pt), 0)
  for (const t of taskIdeas) {
    const lp = resolveLinkedProjectTitle(t.linked_project, projectTitles)
    if (lp) tasksByProject.set(norm(lp), (tasksByProject.get(norm(lp)) ?? 0) + 1)
  }

  for (const pt of projectTitles) {
    if (taskIdeas.length >= DREAM_CATCHER_LIMITS.tasks.max) break
    if ((tasksByProject.get(norm(pt)) ?? 0) >= 1) continue
    const needed = Math.min(2, DREAM_CATCHER_LIMITS.tasks.max - taskIdeas.length)
    if (needed <= 0) break
    taskIdeas = [...taskIdeas, ...inferTasksForProject(pt, needed)]
  }

  const taskItems = taskItemsFromIdeas(
    taskIdeas.slice(0, DREAM_CATCHER_LIMITS.tasks.max),
    projectTitles,
    goalTitles
  )
  items.push(...taskItems)

  return items
}

/** Replace goal-echo projects with intake milestones; ensure projects meet minimum. */
export function reconcileProjectsWithIntake(
  plan: OnboardingPlan,
  input: DreamCatcherAssessmentInput
): OnboardingPlan {
  const goalItems = plan.items.filter((i) => i.type === 'create_goal')
  const goalTitles = goalItems.map((g) => g.title)
  if (goalTitles.length === 0) return plan

  const nonProjectItems = plan.items.filter((i) => i.type !== 'create_project')
  let projectItems = plan.items.filter((i) => i.type === 'create_project')

  projectItems = projectItems.filter((p) => {
    const ref = p.goal_title_ref || ''
    const goalMatch = goalTitles.find((g) => norm(g) === norm(ref)) || ref
    return !isProjectDuplicateOfGoal(p.title, goalMatch || p.title)
  })

  const intakeIdeas = intakeProjectIdeas(input)
  const existingKeys = new Set(projectItems.map((p) => norm(p.title)))

  for (const idea of intakeIdeas) {
    if (projectItems.length >= DREAM_CATCHER_LIMITS.projects.max) break
    const linkedGoal = resolveLinkedGoalTitle(idea.linked_goal, goalTitles)
    if (!linkedGoal || isProjectDuplicateOfGoal(idea.title, linkedGoal)) continue
    const key = norm(idea.title)
    if (existingKeys.has(key)) continue
    existingKeys.add(key)
    projectItems.push({
      type: 'create_project',
      title: idea.title.slice(0, 255),
      description:
        idea.description || `Milestone toward "${linkedGoal}" from your Dream Catcher intake.`,
      goal_title_ref: linkedGoal,
      category: sanitizeCategory(idea.category),
      target_points: 20,
      priority: 'medium',
    })
  }

  const projectsPerGoal = new Map<string, number>()
  for (const g of goalTitles) projectsPerGoal.set(norm(g), 0)
  for (const p of projectItems) {
    const ref = p.goal_title_ref || goalTitles[0]
    projectsPerGoal.set(norm(ref), (projectsPerGoal.get(norm(ref)) ?? 0) + 1)
  }

  for (const goal of goalItems) {
    if (projectItems.length >= DREAM_CATCHER_LIMITS.projects.max) break
    if ((projectsPerGoal.get(norm(goal.title)) ?? 0) >= 1) continue
    const seed = input.seedGoals?.find((s) => norm(s.goal) === norm(goal.title))
    for (const milestone of inferMilestonesForGoal(goal.title, seed?.category, 1)) {
      if (projectItems.length >= DREAM_CATCHER_LIMITS.projects.max) break
      const key = norm(milestone.title)
      if (existingKeys.has(key)) continue
      existingKeys.add(key)
      projectItems.push({
        type: 'create_project',
        title: milestone.title.slice(0, 255),
        description: milestone.description,
        goal_title_ref: goal.title,
        category: sanitizeCategory(milestone.category),
        target_points: 20,
        priority: 'medium',
      })
      projectsPerGoal.set(norm(goal.title), (projectsPerGoal.get(norm(goal.title)) ?? 0) + 1)
    }
  }

  const projectTitles = new Set(projectItems.map((p) => norm(p.title)))
  const goalTitleList = goalTitles
  const projectTitleList = projectItems.map((p) => p.title)

  const taskItems = plan.items.filter(
    (i): i is Extract<OnboardingPlanItem, { type: 'create_task' }> => i.type === 'create_task'
  )
  const validTasks = taskItems.filter(
    (t) =>
      projectTitles.has(norm(t.project_title || '')) &&
      !isTaskDuplicateOfGoalOrProject(t.title, goalTitleList, projectTitleList)
  )

  const intakeTasks = taskItemsFromIdeas(intakeTaskIdeas(input), projectTitleList, goalTitleList)
  const taskKeys = new Set(validTasks.map((t) => norm(t.title)))
  for (const t of intakeTasks) {
    if (validTasks.length >= DREAM_CATCHER_LIMITS.tasks.max) break
    if (taskKeys.has(norm(t.title))) continue
    validTasks.push(t)
    taskKeys.add(norm(t.title))
  }

  const tasksPerProject = new Map<string, number>()
  for (const pt of projectTitleList) tasksPerProject.set(norm(pt), 0)
  for (const t of validTasks) {
    tasksPerProject.set(
      norm(t.project_title),
      (tasksPerProject.get(norm(t.project_title)) ?? 0) + 1
    )
  }

  for (const pt of projectTitleList) {
    if (validTasks.length >= DREAM_CATCHER_LIMITS.tasks.max) break
    if ((tasksPerProject.get(norm(pt)) ?? 0) >= 1) continue
    for (const inferred of inferTasksForProject(pt, 1)) {
      if (validTasks.length >= DREAM_CATCHER_LIMITS.tasks.max) break
      const built = taskItemsFromIdeas([inferred], projectTitleList, goalTitleList)
      for (const t of built) {
        if (taskKeys.has(norm(t.title))) continue
        validTasks.push(t)
        taskKeys.add(norm(t.title))
        tasksPerProject.set(norm(pt), (tasksPerProject.get(norm(pt)) ?? 0) + 1)
      }
    }
  }

  const otherItems = nonProjectItems.filter((i) => i.type !== 'create_task')

  return {
    ...plan,
    items: [...otherItems, ...projectItems, ...validTasks],
  }
}

/** Reconcile goals → projects → tasks hierarchy with intake data. */
export function reconcilePlanWithIntake(
  plan: OnboardingPlan,
  input: DreamCatcherAssessmentInput
): OnboardingPlan {
  return reconcileProjectsWithIntake(plan, input)
}

export function formatTaskIdeasForPrompt(input: DreamCatcherAssessmentInput): string {
  const ideas = intakeTaskIdeas(input)
  if (!ideas.length) {
    return '(none captured yet — infer concrete step-by-step tactics from intake, NOT goal or project copies)'
  }
  return ideas
    .map(
      (t) =>
        `- "${t.title}" → project: ${t.linked_project || '(assign)'}${t.description ? ` — ${t.description}` : ''}${t.step_order != null ? ` [step ${t.step_order}]` : ''}`
    )
    .join('\n')
}

export function formatProjectIdeasForPrompt(input: DreamCatcherAssessmentInput): string {
  const ideas = intakeProjectIdeas(input)
  if (!ideas.length) return '(none captured yet — infer milestones from intake, NOT goal copies)'
  return ideas
    .map(
      (p) =>
        `- "${p.title}" → goal: ${p.linked_goal || '(assign)'}${p.description ? ` — ${p.description}` : ''}`
    )
    .join('\n')
}
