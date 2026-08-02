import { z } from 'zod'

export const projectCategorySchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z_]+$/, 'Category must contain only lowercase letters and underscores')

const optionalGoalIdSchema = z.preprocess(
  (value) => (value === '' || value === undefined ? null : value),
  z.string().uuid().nullable().optional()
)

export const createProjectSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  goal_id: optionalGoalIdSchema,
  category: projectCategorySchema.default('other'),
  target_points: z.number().int().min(0).default(0),
  target_money: z.number().min(0).default(0),
  current_points: z.number().int().min(0).default(0),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  deadline: z.string().optional(),
})

export const updateProjectSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  goal_id: optionalGoalIdSchema,
  category: projectCategorySchema.optional(),
  target_points: z.number().int().min(0).optional(),
  target_money: z.number().min(0).optional(),
  current_points: z.number().int().min(0).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  deadline: z.string().optional(),
})

export function formatZodIssues(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join('; ')
}
