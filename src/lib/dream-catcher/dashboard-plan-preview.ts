import type { OnboardingPlan } from '@/lib/dream-catcher/generate-onboarding-plan'

export type DashboardPlanPreview = {
  summary: string
  vision_statement?: string
  goals: Array<{ title: string; description?: string }>
  projects: Array<{ title: string; description?: string; goal_title_ref?: string }>
  tasks: Array<{ title: string; description?: string; project_title?: string }>
  habits: Array<{ title: string; description?: string }>
  totals: {
    goals: number
    projects: number
    tasks: number
    habits: number
  }
}

export function buildDashboardPlanPreview(
  plan: OnboardingPlan,
  visionStatement?: string
): DashboardPlanPreview {
  const goals = plan.items
    .filter((i) => i.type === 'create_goal')
    .map((i) => ({ title: i.title, description: i.description }))
  const projects = plan.items
    .filter((i) => i.type === 'create_project')
    .map((i) => ({
      title: i.title,
      description: i.description,
      goal_title_ref: i.goal_title_ref,
    }))
  const tasks = plan.items
    .filter((i) => i.type === 'create_task')
    .map((i) => ({
      title: i.title,
      description: i.description,
      project_title: i.project_title,
    }))
  const habits = plan.items
    .filter((i) => i.type === 'create_habit')
    .map((i) => ({ title: i.title, description: i.description }))

  return {
    summary: plan.summary,
    vision_statement: visionStatement,
    goals,
    projects,
    tasks,
    habits,
    totals: {
      goals: goals.length,
      projects: projects.length,
      tasks: tasks.length,
      habits: habits.length,
    },
  }
}
