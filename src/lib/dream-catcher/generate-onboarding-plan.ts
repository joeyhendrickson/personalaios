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
import { DREAM_CATCHER_LIMITS, formatPlanLimitsForPrompt } from '@/lib/dream-catcher/plan-limits'
import {
  buildHierarchyFromIntake,
  formatProjectIdeasForPrompt,
  formatTaskIdeasForPrompt,
  reconcilePlanWithIntake,
} from '@/lib/dream-catcher/plan-projects'
import { normalizeOnboardingPlan } from '@/lib/dream-catcher/normalize-onboarding-plan'

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
  items: z.array(onboardingItemSchema).min(1).max(40),
})

export type OnboardingPlan = z.infer<typeof onboardingPlanSchema>
export type OnboardingPlanItem = z.infer<typeof onboardingItemSchema>

export type SeedGoal = {
  goal: string
  description?: string
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
  projectIdeas?: Array<{
    title: string
    description?: string
    category?: string
    linked_goal?: string
  }>
  habitIdeas?: Array<{ title: string; description?: string }>
  taskIdeas?: Array<{
    title: string
    description?: string
    category?: string
    linked_project?: string
    step_order?: number
  }>
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

export function clampOnboardingPlan(plan: OnboardingPlan): OnboardingPlan {
  const L = DREAM_CATCHER_LIMITS
  const items: OnboardingPlanItem[] = []
  const counts = {
    goals: 0,
    projects: 0,
    tasks: 0,
    habits: 0,
    education: 0,
    fitness: 0,
    ruminations: 0,
    gratitude: 0,
    relationships: 0,
  }

  const goalTitles = new Set<string>()
  const projectTitles = new Set<string>()

  for (const item of plan.items) {
    switch (item.type) {
      case 'create_goal':
        if (counts.goals >= L.goals.max) continue
        counts.goals++
        goalTitles.add(item.title.trim().toLowerCase())
        items.push(item)
        break
      case 'create_project':
        if (counts.projects >= L.projects.max) continue
        counts.projects++
        projectTitles.add(item.title.trim().toLowerCase())
        items.push(item)
        break
      case 'create_task':
        if (counts.tasks >= L.tasks.max) continue
        counts.tasks++
        items.push(item)
        break
      case 'create_habit':
        if (counts.habits >= L.habits.max) continue
        counts.habits++
        items.push(item)
        break
      case 'create_education_item':
        if (counts.education >= L.education.max) continue
        counts.education++
        items.push(item)
        break
      case 'create_fitness_goal':
        if (counts.fitness >= L.fitnessGoals.max) continue
        counts.fitness++
        items.push(item)
        break
      case 'create_fear_insight':
        if (counts.ruminations >= L.ruminations.max) continue
        counts.ruminations++
        items.push(item)
        break
      case 'create_gratitude_starter':
        if (counts.gratitude >= 1) continue
        counts.gratitude++
        items.push(item)
        break
      case 'create_relationship':
        if (counts.relationships >= L.relationships.max) continue
        counts.relationships++
        items.push(item)
        break
      default:
        break
    }
  }

  return { ...plan, items }
}

export function buildFallbackPlan(input: DreamCatcherAssessmentInput): OnboardingPlan {
  const items: OnboardingPlanItem[] = [...buildHierarchyFromIntake(input)]

  for (const habit of input.habitIdeas?.slice(0, DREAM_CATCHER_LIMITS.habits.max) ?? []) {
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

  for (const edu of input.educationItems?.slice(0, DREAM_CATCHER_LIMITS.education.max) ?? []) {
    items.push({
      type: 'create_education_item',
      title: edu.title.slice(0, 255),
      description: edu.description,
      points_value: 100,
      priority_level: edu.priority_level ?? 3,
      target_date: edu.target_date ?? null,
    })
  }

  for (const fg of input.fitnessProfile?.goals?.slice(0, DREAM_CATCHER_LIMITS.fitnessGoals.max) ??
    []) {
    const desc = typeof fg.description === 'string' ? fg.description : JSON.stringify(fg)
    items.push({
      type: 'create_fitness_goal',
      goal_type: mapFitnessGoalType(typeof fg.goal_type === 'string' ? fg.goal_type : desc),
      description: desc.slice(0, 500),
      timeline_weeks: typeof fg.timeline_weeks === 'number' ? fg.timeline_weeks : 12,
      priority_level: 'medium',
    })
  }

  for (const r of input.ruminations?.slice(0, DREAM_CATCHER_LIMITS.ruminations.max) ?? []) {
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

  for (const rel of input.keyRelationships?.slice(0, DREAM_CATCHER_LIMITS.relationships.max) ??
    []) {
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

  const clamped = clampOnboardingPlan({
    summary: 'Life Plan generated from your Dream Catcher session.',
    life_plan_summary: input.lifePlanSummary,
    items,
  })
  return normalizeOnboardingPlan(clamped) ?? clamped
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
      `TASK IDEAS:\n${input.taskIdeas.map((t) => `- ${t.title}${t.linked_project ? ` → ${t.linked_project}` : ''}: ${t.description || ''}`).join('\n')}`
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
        `- ${g.goal}${g.description ? `: ${g.description}` : ''}${g.category ? ` (${g.category})` : ''}${g.timeline ? ` — ${g.timeline}` : ''}${g.target_value != null ? ` [target: ${g.target_value} ${g.target_unit || ''}]` : ''}`
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
${seedList || `(none — infer ${DREAM_CATCHER_LIMITS.goals.min}-${DREAM_CATCHER_LIMITS.goals.max} meaningful goals from the vision and assessment)`}

PROJECTS / STRATEGIES CAPTURED IN INTAKE (use these — do NOT copy goal titles as projects):
${formatProjectIdeasForPrompt(input)}

TASKS / TACTICS CAPTURED IN INTAKE (use these — concrete steps linked to projects):
${formatTaskIdeasForPrompt(input)}

FULL ASSESSMENT DETAIL:
${formatAssessmentBlock(input)}

RULES (strict — do not exceed these counts):
${formatPlanLimitsForPrompt()}
- EDUCATION: 1-3 items when learning goals were mentioned
- FITNESS: 1-2 goals when fitness was discussed
- FEAR INSIGHTS: 1-4 from ruminations/blocks
- GRATITUDE: one starter with 3+ items when gratitude data exists
- RELATIONSHIPS: up to 3 key people
- Order items: goals → projects → tasks → habits → education → fitness → fear insights → gratitude → relationships
- Each goal description must be UNIQUE and include how completion is measured (metric or milestone)
- PROJECTS must be milestones or smaller initiatives that ADD UP TO a goal — never repeat or rephrase a goal title
- Prefer project_ideas from intake; each project needs a unique description tied to what the user said
- Each project must link to exactly one goal via goal_title_ref; distribute ${DREAM_CATCHER_LIMITS.projects.min}-${DREAM_CATCHER_LIMITS.projects.max} projects across goals
- TASKS must be concrete tactics/steps (setup, outreach, research, practice, review) — never repeat a goal or project title
- Prefer task_ideas from intake; each task needs a unique description and must link to a project via project_title
- Distribute ${DREAM_CATCHER_LIMITS.tasks.min}-${DREAM_CATCHER_LIMITS.tasks.max} tasks across projects (at least 1 per project)
- life_plan_summary: 2 short paragraphs of who this person is, their vision, and their goals

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

    const reconciled = reconcilePlanWithIntake(plan, input)
    const clamped = clampOnboardingPlan(reconciled)
    return normalizeOnboardingPlan(clamped) ?? buildFallbackPlan(input)
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
      description:
        typeof (g as { description?: string }).description === 'string'
          ? (g as { description?: string }).description
          : undefined,
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
