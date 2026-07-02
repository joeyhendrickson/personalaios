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
const educationItemSchema = z.object({
  type: z.literal('create_education_item'),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  points_value: z.number().int().min(1).max(500).default(100),
  priority_level: z.number().int().min(1).max(5).default(3),
  target_date: z.string().nullable().optional(),
})
const fitnessGoalItemSchema = z.object({
  type: z.literal('create_fitness_goal'),
  goal_type: z.enum([
    'weight_loss',
    'muscle_gain',
    'endurance',
    'strength',
    'flexibility',
    'body_recomposition',
    'general_fitness',
  ]),
  description: z.string().optional(),
  target_weight: z.number().optional(),
  current_weight: z.number().optional(),
  target_body_fat_percentage: z.number().optional(),
  current_body_fat_percentage: z.number().optional(),
  target_areas: z.array(z.string()).optional(),
  timeline_weeks: z.number().int().min(1).max(104).default(12),
  priority_level: z.enum(['low', 'medium', 'high']).default('medium'),
})
const fearInsightItemSchema = z.object({
  type: z.literal('create_fear_insight'),
  description: z.string().min(1).max(2000),
  fear_type: z.string().default('general'),
  severity: z.enum(['low', 'medium', 'high']).default('medium'),
  coping_strategies: z.array(z.string()).optional(),
})
const gratitudeStarterItemSchema = z.object({
  type: z.literal('create_gratitude_starter'),
  gratitude_items: z.array(z.string().min(1)).min(1).max(10),
  reflection: z.string().optional(),
})
const relationshipItemSchema = z.object({
  type: z.literal('create_relationship'),
  name: z.string().min(1).max(255),
  relationship_type: z.enum([
    'family',
    'friend',
    'colleague',
    'business',
    'mentor',
    'acquaintance',
  ]),
  contact_frequency_days: z.number().int().min(1).max(365).default(14),
  notes: z.string().optional(),
  priority_level: z.number().int().min(1).max(5).default(3),
})

export const onboardingItemSchema = z.discriminatedUnion('type', [
  goalItemSchema,
  projectItemSchema,
  taskItemSchema,
  habitItemSchema,
  educationItemSchema,
  fitnessGoalItemSchema,
  fearInsightItemSchema,
  gratitudeStarterItemSchema,
  relationshipItemSchema,
])

export const onboardingPlanSchema = z.object({
  summary: z.string().min(1),
  life_plan_summary: z.string().optional(),
  items: z.array(onboardingItemSchema).min(1).max(120),
})

export type OnboardingPlan = z.infer<typeof onboardingPlanSchema>
export type OnboardingPlanItem = z.infer<typeof onboardingItemSchema>

export type SeedGoal = {
  goal: string
  category?: string
  priority?: string
  timeline?: string
  target_value?: number
  target_unit?: string
}

export type DreamCatcherAssessmentInput = {
  visionStatement?: string
  lifePlanSummary?: string
  dreams?: string[]
  personalityTraits?: string[]
  personalInsights?: string[]
  measurementPreferences?: string[]
  seedGoals?: SeedGoal[]
  projectIdeas?: Array<{ title: string; description?: string; category?: string }>
  habitIdeas?: Array<{ title: string; description?: string }>
  taskIdeas?: Array<{ title: string; description?: string; category?: string }>
  educationItems?: Array<{
    title: string
    description?: string
    target_date?: string
    priority_level?: number
  }>
  fitnessProfile?: {
    goals?: Array<Record<string, unknown>>
    baseline?: Record<string, unknown>
  }
  ruminations?: Array<{
    description: string
    severity?: string
    fear_type?: string
    coping_strategies?: string[]
  }>
  gratitudeStarters?: {
    items?: string[]
    practice_idea?: string
    reflection?: string
  }
  keyRelationships?: Array<{
    name: string
    relationship_type?: string
    notes?: string
    contact_frequency_days?: number
    priority_level?: number
  }>
}

/** @deprecated use DreamCatcherAssessmentInput */
export type OnboardingPlanInput = DreamCatcherAssessmentInput

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

function mapFitnessGoalType(raw?: string): z.infer<typeof fitnessGoalItemSchema>['goal_type'] {
  const t = (raw || '').toLowerCase()
  if (t.includes('weight') && t.includes('loss')) return 'weight_loss'
  if (t.includes('muscle')) return 'muscle_gain'
  if (t.includes('endurance') || t.includes('cardio')) return 'endurance'
  if (t.includes('strength')) return 'strength'
  if (t.includes('flex')) return 'flexibility'
  if (t.includes('recomp')) return 'body_recomposition'
  return 'general_fitness'
}

export function buildFallbackPlan(input: DreamCatcherAssessmentInput): OnboardingPlan {
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
      target_value: seed.target_value ?? 1,
      target_unit: seed.target_unit ?? 'milestone',
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
  }

  for (const habit of input.habitIdeas?.slice(0, 5) ?? []) {
    items.push({
      type: 'create_habit',
      title: habit.title.slice(0, 255),
      description: habit.description,
      points_per_completion: 25,
    })
  }
  if (!input.habitIdeas?.length) {
    for (const title of ['Review my goals', 'Plan my top 3 tasks for the day']) {
      items.push({ type: 'create_habit', title, points_per_completion: 25 })
    }
  }

  for (const edu of input.educationItems?.slice(0, 3) ?? []) {
    items.push({
      type: 'create_education_item',
      title: edu.title.slice(0, 255),
      description: edu.description,
      points_value: 100,
      priority_level: edu.priority_level ?? 3,
      target_date: edu.target_date ?? null,
    })
  }

  for (const fg of input.fitnessProfile?.goals?.slice(0, 2) ?? []) {
    const desc = typeof fg.description === 'string' ? fg.description : JSON.stringify(fg)
    items.push({
      type: 'create_fitness_goal',
      goal_type: mapFitnessGoalType(typeof fg.goal_type === 'string' ? fg.goal_type : desc),
      description: desc.slice(0, 500),
      timeline_weeks: typeof fg.timeline_weeks === 'number' ? fg.timeline_weeks : 12,
      priority_level: 'medium',
    })
  }

  for (const r of input.ruminations?.slice(0, 4) ?? []) {
    items.push({
      type: 'create_fear_insight',
      description: r.description.slice(0, 2000),
      fear_type: (r.fear_type || 'general').slice(0, 80),
      severity: (r.severity === 'low' || r.severity === 'high' ? r.severity : 'medium') as
        | 'low'
        | 'medium'
        | 'high',
      coping_strategies: r.coping_strategies,
    })
  }

  const gratitudeItems = input.gratitudeStarters?.items?.filter(Boolean) ?? []
  if (gratitudeItems.length) {
    items.push({
      type: 'create_gratitude_starter',
      gratitude_items: gratitudeItems.slice(0, 10),
      reflection:
        input.gratitudeStarters?.reflection || input.gratitudeStarters?.practice_idea || undefined,
    })
  }

  for (const rel of input.keyRelationships?.slice(0, 3) ?? []) {
    const relType = rel.relationship_type?.toLowerCase()
    const allowed = ['family', 'friend', 'colleague', 'business', 'mentor', 'acquaintance'] as const
    items.push({
      type: 'create_relationship',
      name: rel.name.slice(0, 255),
      relationship_type: allowed.includes(relType as (typeof allowed)[number])
        ? (relType as (typeof allowed)[number])
        : 'friend',
      contact_frequency_days: rel.contact_frequency_days ?? 14,
      notes: rel.notes,
      priority_level: rel.priority_level ?? 3,
    })
  }

  return {
    summary: 'Life Plan generated from your Dream Catcher session.',
    life_plan_summary: input.lifePlanSummary,
    items,
  }
}

function formatAssessmentBlock(input: DreamCatcherAssessmentInput): string {
  const sections: string[] = []
  if (input.lifePlanSummary) sections.push(`LIFE PLAN SUMMARY:\n${input.lifePlanSummary}`)
  if (input.measurementPreferences?.length) {
    sections.push(`MEASUREMENT PREFERENCES:\n- ${input.measurementPreferences.join('\n- ')}`)
  }
  if (input.personalInsights?.length) {
    sections.push(`PERSONAL INSIGHTS:\n- ${input.personalInsights.join('\n- ')}`)
  }
  if (input.projectIdeas?.length) {
    sections.push(
      `PROJECT IDEAS:\n${input.projectIdeas.map((p) => `- ${p.title}: ${p.description || ''}`).join('\n')}`
    )
  }
  if (input.taskIdeas?.length) {
    sections.push(
      `TASK IDEAS:\n${input.taskIdeas.map((t) => `- ${t.title}: ${t.description || ''}`).join('\n')}`
    )
  }
  if (input.habitIdeas?.length) {
    sections.push(
      `HABIT IDEAS:\n${input.habitIdeas.map((h) => `- ${h.title}: ${h.description || ''}`).join('\n')}`
    )
  }
  if (input.educationItems?.length) {
    sections.push(`EDUCATION:\n${JSON.stringify(input.educationItems, null, 2)}`)
  }
  if (input.fitnessProfile) {
    sections.push(`FITNESS:\n${JSON.stringify(input.fitnessProfile, null, 2)}`)
  }
  if (input.ruminations?.length) {
    sections.push(`RUMINATIONS/BLOCKS:\n${JSON.stringify(input.ruminations, null, 2)}`)
  }
  if (input.gratitudeStarters) {
    sections.push(`GRATITUDE:\n${JSON.stringify(input.gratitudeStarters, null, 2)}`)
  }
  if (input.keyRelationships?.length) {
    sections.push(`KEY RELATIONSHIPS:\n${JSON.stringify(input.keyRelationships, null, 2)}`)
  }
  return sections.join('\n\n')
}

export async function generateOnboardingPlan(
  input: DreamCatcherAssessmentInput
): Promise<OnboardingPlan> {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
    return buildFallbackPlan(input)
  }

  const seedList = (input.seedGoals || [])
    .filter((g) => g && g.goal)
    .map(
      (g) =>
        `- ${g.goal}${g.category ? ` (${g.category})` : ''}${g.timeline ? ` — ${g.timeline}` : ''}${g.target_value != null ? ` [target: ${g.target_value} ${g.target_unit || ''}]` : ''}`
    )
    .join('\n')

  const prompt = `You are setting up a brand-new user's Life Plan across the LifeStacks dashboard AND life modules.
Convert their Dream Catcher assessment into a complete, actionable plan distributed to the right places.

VISION STATEMENT:
${input.visionStatement || '(none provided)'}

DREAMS:
${(input.dreams || []).map((d) => `- ${d}`).join('\n') || '(none provided)'}

PERSONALITY / TRAITS:
${(input.personalityTraits || []).join(', ') || '(none provided)'}

DRAFT GOALS FROM THE SESSION:
${seedList || '(none — infer 3-5 meaningful goals from the vision and assessment)'}

FULL ASSESSMENT DETAIL:
${formatAssessmentBlock(input)}

RULES (strict):
1. Create 3-6 measurable GOALS (create_goal). Each needs goal_type, target_value, target_unit.
2. Create 1-2 PROJECTS per goal (create_project) with exact goal_title_ref linkage.
3. Create 2-4 TASKS per project (create_task) with exact project_title linkage.
4. Create 3-5 daily HABITS (create_habit) from habit ideas.
5. Create 1-3 EDUCATION items (create_education_item) when learning goals were mentioned.
6. Create 1-2 FITNESS goals (create_fitness_goal) when fitness was discussed — use appropriate goal_type.
7. Create 1-4 FEAR INSIGHTS (create_fear_insight) from ruminations/blocks for Focus Enhancer starter ruminations.
8. Create ONE gratitude starter (create_gratitude_starter) with gratitude_items array (3+ items) when gratitude data exists.
9. Create up to 3 RELATIONSHIPS (create_relationship) for key people — friend/family/etc., contact_frequency_days from user input.
10. Order: goals → projects → tasks → habits → education → fitness → fear insights → gratitude → relationships.
11. life_plan_summary: 2-3 sentence overview for the user (who they are + what they are building).

Return ONLY valid JSON (no markdown):
{
  "summary": "1-2 sentence overview of the plan",
  "life_plan_summary": "Personal narrative summary",
  "items": [ ...typed items... ]
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

/** Map raw assessment_data JSON from Dream Catcher chat into plan generator input. */
export function assessmentDataToPlanInput(
  raw: Record<string, unknown>
): DreamCatcherAssessmentInput {
  const goalsGenerated = (raw.goals_generated as SeedGoal[] | undefined) ?? []
  return {
    visionStatement: typeof raw.vision_statement === 'string' ? raw.vision_statement : undefined,
    lifePlanSummary: typeof raw.life_plan_summary === 'string' ? raw.life_plan_summary : undefined,
    dreams: Array.isArray(raw.dreams_discovered) ? (raw.dreams_discovered as string[]) : undefined,
    personalityTraits: Array.isArray(raw.personality_traits)
      ? (raw.personality_traits as string[])
      : undefined,
    personalInsights: Array.isArray(raw.personal_insights)
      ? (raw.personal_insights as string[])
      : undefined,
    measurementPreferences: Array.isArray(raw.measurement_preferences)
      ? (raw.measurement_preferences as string[])
      : undefined,
    seedGoals: goalsGenerated.map((g) => ({
      goal: g.goal,
      category: g.category,
      priority: g.priority,
      timeline: g.timeline,
      target_value:
        typeof (g as { target_value?: number }).target_value === 'number'
          ? (g as { target_value?: number }).target_value
          : undefined,
      target_unit:
        typeof (g as { target_unit?: string }).target_unit === 'string'
          ? (g as { target_unit?: string }).target_unit
          : undefined,
    })),
    projectIdeas: raw.project_ideas as DreamCatcherAssessmentInput['projectIdeas'],
    habitIdeas: raw.habit_ideas as DreamCatcherAssessmentInput['habitIdeas'],
    taskIdeas: raw.task_ideas as DreamCatcherAssessmentInput['taskIdeas'],
    educationItems: raw.education_items as DreamCatcherAssessmentInput['educationItems'],
    fitnessProfile: raw.fitness_profile as DreamCatcherAssessmentInput['fitnessProfile'],
    ruminations: raw.ruminations as DreamCatcherAssessmentInput['ruminations'],
    gratitudeStarters: raw.gratitude_starters as DreamCatcherAssessmentInput['gratitudeStarters'],
    keyRelationships: raw.key_relationships as DreamCatcherAssessmentInput['keyRelationships'],
  }
}
