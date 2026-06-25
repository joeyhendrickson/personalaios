import { z } from 'zod'

export const projectCategorySchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z_]+$/)
  .default('other')

export const taskCategorySchema = z.enum([
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
])

export const createGoalPayloadSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  goal_type: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
  target_value: z.number().min(0),
  target_unit: z.string().min(1).max(50),
  priority_level: z.number().int().min(1).max(5).default(3),
  start_date: z.string().nullable().optional(),
  target_date: z.string().nullable().optional(),
})

export const createProjectPayloadSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  goal_id: z.string().uuid().optional(),
  /** Links to a goal created in the same plan batch (title match, case-insensitive). */
  goal_title_ref: z.string().min(1).max(255).optional(),
  category: projectCategorySchema,
  target_points: z.number().int().min(0).default(10),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
})

export const createTaskPayloadSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  weekly_goal_id: z.string().uuid().optional(),
  /** Links to a project in the same plan batch (title match, case-insensitive). */
  project_title: z.string().min(1).max(255).optional(),
  category: taskCategorySchema.default('other'),
  points_value: z.number().int().min(1).max(1000).default(5),
})

export const createHabitPayloadSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  points_per_completion: z.number().int().min(5).max(100).default(25),
})

export const completeTaskPayloadSchema = z.object({
  task_id: z.string().uuid(),
  title: z.string().min(1).max(255),
})

export const completeHabitPayloadSchema = z.object({
  habit_id: z.string().uuid(),
  title: z.string().min(1).max(255),
})

export const aiPlanItemSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('create_goal'),
    })
    .merge(createGoalPayloadSchema),
  z
    .object({
      type: z.literal('create_project'),
    })
    .merge(createProjectPayloadSchema),
  z.object({
    type: z.literal('create_task'),
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    project_title: z.string().min(1).max(255),
    category: taskCategorySchema.default('other'),
    points_value: z.number().int().min(1).max(1000).default(5),
  }),
  z.object({ type: z.literal('create_habit') }).merge(createHabitPayloadSchema),
])

export const aiPlanResponseSchema = z.object({
  summary: z.string().min(1),
  items: z.array(aiPlanItemSchema).min(1).max(40),
})

export type ActionProposalRow = {
  id: string
  user_id: string
  action_type:
    | 'create_goal'
    | 'create_project'
    | 'create_task'
    | 'create_habit'
    | 'complete_task'
    | 'complete_habit'
  payload: Record<string, unknown>
  status: string
  plan_group_id: string | null
  sort_order: number
  expires_at: string
}

export function formatProposalPreview(
  actionType: ActionProposalRow['action_type'],
  payload: Record<string, unknown>
): string {
  switch (actionType) {
    case 'create_goal':
      return [
        `Goal: ${payload.title}`,
        payload.description ? String(payload.description) : '',
        `Type: ${payload.goal_type}`,
        `Target: ${payload.target_value} ${payload.target_unit}`,
      ]
        .filter(Boolean)
        .join('\n')
    case 'create_project':
      return [
        `Project: ${payload.title}`,
        payload.description ? String(payload.description) : '',
        `Category: ${payload.category}`,
        payload.goal_id
          ? 'Linked to an existing goal'
          : payload.goal_title_ref
            ? `Linked to goal: ${payload.goal_title_ref}`
            : '',
      ]
        .filter(Boolean)
        .join('\n')
    case 'create_task':
      return [
        `Task: ${payload.title}`,
        payload.description ? String(payload.description) : '',
        `Category: ${payload.category}`,
        payload.project_title
          ? `Project: ${payload.project_title}`
          : payload.weekly_goal_id
            ? 'Linked to project'
            : '',
      ]
        .filter(Boolean)
        .join('\n')
    case 'create_habit':
      return [
        `Habit: ${payload.title}`,
        payload.description ? String(payload.description) : '',
        `Points: ${payload.points_per_completion ?? 25}/completion`,
      ]
        .filter(Boolean)
        .join('\n')
    case 'complete_task':
      return `Mark task complete: ${payload.title}`
    case 'complete_habit':
      return `Log habit for today: ${payload.title}`
    default:
      return JSON.stringify(payload, null, 2)
  }
}
