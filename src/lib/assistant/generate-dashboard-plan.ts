import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { resolveOpenAIModelId } from '@/lib/ai/openai-model-id'
import { aiPlanResponseSchema } from '@/lib/assistant/proposal-schemas'

type GoalOption = { id: string; title: string; goal_type: string }
type ProjectOption = { id: string; title: string }
type HabitOption = { title: string }

export async function generateDashboardPlanFromConversation(
  conversation: { role: string; content: string }[],
  existingGoals: GoalOption[],
  existingProjects: ProjectOption[] = [],
  existingHabits: HabitOption[] = []
) {
  const goalsList =
    existingGoals.length > 0
      ? existingGoals.map((g) => `- id: ${g.id} | "${g.title}" (${g.goal_type})`).join('\n')
      : 'None yet — include create_goal items first, then projects linked via goal_title_ref.'

  const projectsList =
    existingProjects.length > 0
      ? existingProjects.map((p) => `- "${p.title}"`).join('\n')
      : 'None yet.'

  const habitsList =
    existingHabits.length > 0 ? existingHabits.map((h) => `- "${h.title}"`).join('\n') : 'None yet.'

  const transcript = conversation
    .slice(-20)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n')

  const prompt = `You are a productivity coach helping a user turn a conversation into a structured dashboard plan.

ADDITIVE BEHAVIOR (very important):
- This plan ADDS to the user's existing dashboard. NEVER propose removing, deleting, replacing, or resetting existing goals, projects, tasks, or habits.
- Do NOT re-create items the user already has (see EXISTING lists below). If a new project belongs under an existing goal, link to it via goal_title_ref using the EXACT existing goal title. If a new task belongs under an existing project, set project_title to the EXACT existing project title.
- Only propose NEW items the conversation calls for. If the user already has everything they discussed, return an empty-ish plan with just a brief summary explaining nothing new is needed.

RULES (strict):
1. Every create_project MUST link to a goal via goal_id (existing) OR goal_title_ref (existing OR new goal title in this plan).
2. Every create_task MUST include project_title matching either an EXISTING project title or a create_project title in this plan (case-insensitive).
3. create_habit items are standalone (small repeatable daily actions) and do not link to goals/projects.
4. Order items: goals first, then projects, then tasks, then habits.
5. Prefer 1-3 projects and 2-5 tasks per project, plus 0-5 habits — actionable, not overwhelming.
6. Use realistic categories: project category = lowercase_with_underscores (e.g. health, business_growth, other).
7. Task category must be one of: quick_money, save_money, health, network_expansion, business_growth, fires, good_living, big_vision, job, organization, tech_issues, business_launch, future_planning, innovation, productivity, learning, financial, personal, other.
8. Do NOT duplicate items already discussed as completed or already present in the EXISTING lists.
9. target_points on projects: 10-50 typical. points_value on tasks: 3-15 typical. points_per_completion on habits: 10-50.

EXISTING USER GOALS:
${goalsList}

EXISTING USER PROJECTS:
${projectsList}

EXISTING USER HABITS:
${habitsList}

CONVERSATION:
${transcript}

Return ONLY valid JSON (no markdown):
{
  "summary": "1-2 sentence overview of what is being ADDED",
  "items": [
    { "type": "create_goal", "title": "...", "description": "...", "goal_type": "monthly", "target_value": 10, "target_unit": "sessions", "priority_level": 3 },
    { "type": "create_project", "title": "...", "description": "...", "goal_id": "uuid OR omit", "goal_title_ref": "Existing or new goal title", "category": "health", "target_points": 20, "priority": "medium" },
    { "type": "create_task", "title": "...", "description": "...", "project_title": "Existing or new project title", "category": "health", "points_value": 5 },
    { "type": "create_habit", "title": "...", "description": "...", "points_per_completion": 25 }
  ]
}`

  const modelId = resolveOpenAIModelId()
  const { text } = await generateText({
    model: openai(modelId),
    messages: [
      { role: 'system', content: 'Return only valid JSON. No markdown fences.' },
      { role: 'user', content: prompt },
    ],
  })

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(`Plan generation returned non-JSON: ${text.slice(0, 200)}`)
  }

  const plan = aiPlanResponseSchema.parse(parsed)

  for (const item of plan.items) {
    if (item.type === 'create_project' && !item.goal_id && !item.goal_title_ref) {
      throw new Error(`Project "${item.title}" must link to a goal`)
    }
    if (item.type === 'create_task' && !item.project_title?.trim()) {
      throw new Error(`Task "${item.title}" must include project_title`)
    }
  }

  return plan
}
