import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { resolveOpenAIModelId } from '@/lib/ai/openai-model-id'
import { aiPlanResponseSchema } from '@/lib/assistant/proposal-schemas'

type GoalOption = { id: string; title: string; goal_type: string }

export async function generateDashboardPlanFromConversation(
  conversation: { role: string; content: string }[],
  existingGoals: GoalOption[]
) {
  const goalsList =
    existingGoals.length > 0
      ? existingGoals.map((g) => `- id: ${g.id} | "${g.title}" (${g.goal_type})`).join('\n')
      : 'None yet — include create_goal items first, then projects linked via goal_title_ref.'

  const transcript = conversation
    .slice(-20)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n')

  const prompt = `You are a productivity coach helping a user turn a conversation into a structured dashboard plan.

RULES (strict):
1. Every create_project MUST link to a goal via goal_id (existing) OR goal_title_ref (new goal in this same plan).
2. Every create_task MUST include project_title matching a create_project title in this plan (case-insensitive).
3. Order items: goals first, then projects, then tasks.
4. Prefer 1-3 projects and 2-5 tasks per project — actionable and not overwhelming.
5. Use realistic categories: project category = lowercase_with_underscores (e.g. health, business_growth, other).
6. Task category must be one of: quick_money, save_money, health, network_expansion, business_growth, fires, good_living, big_vision, job, organization, tech_issues, business_launch, future_planning, innovation, productivity, learning, financial, personal, other.
7. Do NOT duplicate items already discussed as completed.
8. target_points on projects: 10-50 typical. points_value on tasks: 3-15 typical.

EXISTING USER GOALS:
${goalsList}

CONVERSATION:
${transcript}

Return ONLY valid JSON (no markdown):
{
  "summary": "1-2 sentence overview of the plan",
  "items": [
    { "type": "create_goal", "title": "...", "description": "...", "goal_type": "monthly", "target_value": 10, "target_unit": "sessions", "priority_level": 3 },
    { "type": "create_project", "title": "...", "description": "...", "goal_id": "uuid OR omit", "goal_title_ref": "Goal title if new", "category": "health", "target_points": 20, "priority": "medium" },
    { "type": "create_task", "title": "...", "description": "...", "project_title": "Exact project title", "category": "health", "points_value": 5 }
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
