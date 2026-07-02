import type { OnboardingPlan } from '@/lib/dream-catcher/generate-onboarding-plan'

export type DashboardPlanPreview = {
  summary: string
  life_plan_summary?: string
  vision_statement?: string
  goals: Array<{ title: string; description?: string }>
  projects: Array<{ title: string; description?: string; goal_title_ref?: string }>
  tasks: Array<{ title: string; description?: string; project_title?: string }>
  habits: Array<{ title: string; description?: string }>
  education: Array<{ title: string; description?: string }>
  fitness_goals: Array<{ description?: string; goal_type?: string }>
  ruminations: Array<{ description: string; severity?: string }>
  gratitude: Array<{ items: string[]; reflection?: string }>
  relationships: Array<{ name: string; relationship_type?: string; notes?: string }>
  totals: {
    goals: number
    projects: number
    tasks: number
    habits: number
    education: number
    fitness_goals: number
    ruminations: number
    gratitude: number
    relationships: number
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
  const education = plan.items
    .filter((i) => i.type === 'create_education_item')
    .map((i) => ({ title: i.title, description: i.description }))
  const fitness_goals = plan.items
    .filter((i) => i.type === 'create_fitness_goal')
    .map((i) => ({ description: i.description, goal_type: i.goal_type }))
  const ruminations = plan.items
    .filter((i) => i.type === 'create_fear_insight')
    .map((i) => ({ description: i.description, severity: i.severity }))
  const gratitude = plan.items
    .filter((i) => i.type === 'create_gratitude_starter')
    .map((i) => ({ items: i.gratitude_items, reflection: i.reflection }))
  const relationships = plan.items
    .filter((i) => i.type === 'create_relationship')
    .map((i) => ({
      name: i.name,
      relationship_type: i.relationship_type,
      notes: i.notes,
    }))

  return {
    summary: plan.summary,
    life_plan_summary: plan.life_plan_summary,
    vision_statement: visionStatement,
    goals,
    projects,
    tasks,
    habits,
    education,
    fitness_goals,
    ruminations,
    gratitude,
    relationships,
    totals: {
      goals: goals.length,
      projects: projects.length,
      tasks: tasks.length,
      habits: habits.length,
      education: education.length,
      fitness_goals: fitness_goals.length,
      ruminations: ruminations.length,
      gratitude: gratitude.length,
      relationships: relationships.length,
    },
  }
}
