import 'server-only'

import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { resolveOpenAIModelId } from '@/lib/ai/openai-model-id'
import { z } from 'zod'
import {
  createGoalPayloadSchema,
  createProjectPayloadSchema,
  taskCategorySchema,
} from '@/lib/assistant/proposal-schemas'

/**
 * Turns a Dream Catcher assessment into a complete starter dashboard:
 * measurable goals → projects (linked to goals) → tasks (linked to projects) → daily habits.
 * Reuses the assistant proposal payload shapes so the result can be committed with commitProposal().
 */

const goalItemSchema = z.object({ type: z.literal('create_goal') }).merge(createGoalPayloadSchema)
const projectItemSchema = z
  .object({ type: z.literal('create_project') })
  .merge(createProjectPayloadSchema)
const taskItemSchema = z.object({
  type: z.literal('create_task'),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  project_title: z.string().min(1).max(255),
  category: taskCategorySchema.default('other'),
  points_value: z.number().int().min(1).max(1000).default(5),
})
const habitItemSchema = z.object({
  type: z.literal('create_habit'),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  points_per_completion: z.number().int().min(5).max(100).default(25),
})

export const onboardingItemSchema = z.discriminatedUnion('type', [
  goalItemSchema,
  projectItemSchema,
  taskItemSchema,
  habitItemSchema,
])

export const onboardingPlanSchema = z.object({
  summary: z.string().min(1),
  items: z.array(onboardingItemSchema).min(1).max(80),
})

export type OnboardingPlan = z.infer<typeof onboardingPlanSchema>
export type OnboardingPlanItem = z.infer<typeof onboardingItemSchema>

export type SeedGoal = {
  goal: string
  category?: string
  priority?: string
  timeline?: string
}

export type OnboardingPlanInput = {
  visionStatement?: string
  dreams?: string[]
  personalityTraits?: string[]
  seedGoals?: SeedGoal[]
}

function sanitizeCategory(category?: string): string {
  if (!category) return 'other'
  const c = category
    .toLowerCase()
    .replace(/[^a-z]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return c.length ? c : 'other'
}

function priorityLevel(priority?: string): number {
  if (priority === 'high') return 5
  if (priority === 'low') return 2
  return 3
}

/** Deterministic, AI-free plan so onboarding never leaves the user with a blank dashboard. */
export function buildFallbackPlan(input: OnboardingPlanInput): OnboardingPlan {
  const seeds = (input.seedGoals || []).filter((g) => g && g.goal).slice(0, 6)
  const items: OnboardingPlanItem[] = []

  const usableSeeds = seeds.length
    ? seeds
    : [{ goal: 'Build momentum on my top priority', category: 'personal' }]

  for (const seed of usableSeeds) {
    const goalTitle = seed.goal.slice(0, 255)
    items.push({
      type: 'create_goal',
      title: goalTitle,
      description: input.visionStatement
        ? `Supports your vision: ${input.visionStatement.slice(0, 200)}`
        : 'Created from your Dream Catcher session.',
      goal_type: 'monthly',
      target_value: 1,
      target_unit: 'milestone',
      priority_level: priorityLevel(seed.priority),
    })

    const projectTitle = `Kickstart: ${goalTitle}`.slice(0, 255)
    items.push({
      type: 'create_project',
      title: projectTitle,
      description: `First project to make progress on "${goalTitle}".`,
      goal_title_ref: goalTitle,
      category: sanitizeCategory(seed.category),
      target_points: 20,
      priority: 'medium',
    })

    items.push({
      type: 'create_task',
      title: `Define the first step for "${goalTitle}"`.slice(0, 255),
      description: 'Write down the single next action that moves this goal forward.',
      project_title: projectTitle,
      category: 'other',
      points_value: 5,
    })
    items.push({
      type: 'create_task',
      title: `Block 30 minutes this week for "${goalTitle}"`.slice(0, 255),
      description: 'Schedule focused time to begin.',
      project_title: projectTitle,
      category: 'productivity',
      points_value: 5,
    })
  }

  const habitTitles = [
    'Review my goals',
    'Plan my top 3 tasks for the day',
    'Move my body for 20 minutes',
    'Write one thing I am grateful for',
    'Wind down screen-free before bed',
  ]
  for (const title of habitTitles) {
    items.push({ type: 'create_habit', title, points_per_completion: 25 })
  }

  return {
    summary: 'Starter dashboard generated from your Dream Catcher session.',
    items,
  }
}

export async function generateOnboardingPlan(input: OnboardingPlanInput): Promise<OnboardingPlan> {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
    return buildFallbackPlan(input)
  }

  const seedList = (input.seedGoals || [])
    .filter((g) => g && g.goal)
    .map(
      (g) =>
        `- ${g.goal}${g.category ? ` (${g.category})` : ''}${g.timeline ? ` — ${g.timeline}` : ''}`
    )
    .join('\n')

  const prompt = `You are setting up a brand-new user's productivity dashboard from their Dream Catcher self-assessment.
Convert their vision, dreams, and draft goals into a complete, actionable starter dashboard.

VISION STATEMENT:
${input.visionStatement || '(none provided)'}

DREAMS:
${(input.dreams || []).map((d) => `- ${d}`).join('\n') || '(none provided)'}

PERSONALITY / TRAITS:
${(input.personalityTraits || []).join(', ') || '(none provided)'}

DRAFT GOALS FROM THE SESSION:
${seedList || '(none — infer 3-5 meaningful goals from the vision and dreams)'}

RULES (strict):
1. Create 3-6 measurable GOALS. Each goal needs goal_type (weekly|monthly|quarterly|yearly), a numeric target_value, and a target_unit (e.g. "workouts", "dollars", "books", "milestones").
2. Create 1-2 PROJECTS per goal. Every project MUST set goal_title_ref to the EXACT title of one of the goals above.
3. Create 2-4 TASKS per project. Every task MUST set project_title to the EXACT title of one of the projects.
4. Create 5-8 daily HABITS that support the goals (small, repeatable daily actions).
5. project category = lowercase_with_underscores (e.g. health, business_growth, learning, other).
6. task category MUST be one of: quick_money, save_money, health, network_expansion, business_growth, fires, good_living, big_vision, job, organization, tech_issues, business_launch, future_planning, innovation, productivity, learning, financial, personal, other.
7. target_points on projects: 10-50. points_value on tasks: 3-15. points_per_completion on habits: 10-50.
8. Order items: all goals first, then all projects, then all tasks, then all habits.
9. Make everything specific and encouraging — this is the user's first impression of their dashboard.

Return ONLY valid JSON (no markdown):
{
  "summary": "1-2 sentence overview",
  "items": [
    { "type": "create_goal", "title": "...", "description": "...", "goal_type": "monthly", "target_value": 8, "target_unit": "workouts", "priority_level": 3 },
    { "type": "create_project", "title": "...", "description": "...", "goal_title_ref": "Exact goal title", "category": "health", "target_points": 20, "priority": "medium" },
    { "type": "create_task", "title": "...", "description": "...", "project_title": "Exact project title", "category": "health", "points_value": 5 },
    { "type": "create_habit", "title": "...", "description": "...", "points_per_completion": 25 }
  ]
}`

  try {
    const { text } = await generateText({
      model: openai(resolveOpenAIModelId()),
      messages: [
        { role: 'system', content: 'Return only valid JSON. No markdown fences.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
    })

    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    const parsed = JSON.parse(start >= 0 ? text.slice(start, end + 1) : text)
    const plan = onboardingPlanSchema.parse(parsed)

    // Guard the linkage invariants; fall back if the model drifted.
    const goalTitles = new Set(
      plan.items.filter((i) => i.type === 'create_goal').map((i) => i.title.trim().toLowerCase())
    )
    const projectTitles = new Set(
      plan.items.filter((i) => i.type === 'create_project').map((i) => i.title.trim().toLowerCase())
    )
    const linksValid = plan.items.every((i) => {
      if (i.type === 'create_project') {
        return Boolean(i.goal_id) || goalTitles.has((i.goal_title_ref || '').trim().toLowerCase())
      }
      if (i.type === 'create_task') {
        return projectTitles.has((i.project_title || '').trim().toLowerCase())
      }
      return true
    })
    if (!linksValid || goalTitles.size === 0) return buildFallbackPlan(input)

    return plan
  } catch {
    return buildFallbackPlan(input)
  }
}
