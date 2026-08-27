import { z } from 'zod'

export const createGoalSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  goal_type: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
  target_value: z.number().min(0).optional(),
  target_unit: z.string().max(50).optional(),
  current_value: z.number().min(0).default(0),
  priority_level: z.number().int().min(1).max(5).default(3),
  start_date: z.string().optional(),
  target_date: z.string().optional(),
})
