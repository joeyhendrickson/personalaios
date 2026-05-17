import 'server-only'

import { generateText } from 'ai'
import { defaultOpenaiModel } from '@/lib/ai/default-openai-model'
import { createClient } from '@/lib/supabase/server'
import {
  combineMeaningStatements,
  getNarrativeIntegrationEvent,
  getNarrativeIntegrationSession,
  listMeaningExtractions,
} from './actions'

export type DashboardRecommendation = {
  id: string
  type: 'habit' | 'task'
  title: string
  description: string
  rationale: string
  category?: string
}

const TASK_CATEGORIES = [
  'personal',
  'health',
  'productivity',
  'good_living',
  'learning',
  'organization',
  'other',
] as const

export async function buildNarrativeSessionContext(sessionId: string) {
  const session = await getNarrativeIntegrationSession(sessionId)
  const event = await getNarrativeIntegrationEvent(sessionId)
  const meanings = await listMeaningExtractions(sessionId)

  const meaningMap = meanings.map((m) => ({
    category: m.category,
    statement: m.final_meaning_statement || m.user_selected_meaning,
  }))

  return {
    session: {
      title: session.title,
      event_summary: session.event_summary,
      user_goal: session.user_goal,
      emotional_state: session.emotional_state,
      meaning_statement: session.meaning_statement,
      lesson_statement: session.lesson_statement,
      present_grounding_summary: session.present_grounding_summary,
      future_action: session.future_action,
    },
    meaning_map: meaningMap,
    combined_meanings: combineMeaningStatements(meanings),
    event: event
      ? {
          what_happened_briefly: event.what_happened_briefly,
          what_belief_formed_afterward: event.what_belief_formed_afterward,
          frozen_belief: event.frozen_belief,
          current_reinterpretation: event.current_reinterpretation,
          extracted_lesson: event.extracted_lesson,
          how_it_affects_life_now: event.how_it_affects_life_now,
        }
      : null,
  }
}

export async function generateDashboardRecommendations(
  sessionId: string
): Promise<DashboardRecommendation[]> {
  const context = await buildNarrativeSessionContext(sessionId)

  const prompt = `You are helping a user translate narrative integration work into practical dashboard actions.

Based on their meaning map, lessons, and conclusions from this session, propose exactly 3 concrete items they could add to their productivity dashboard.

RULES:
- Return exactly 3 recommendations.
- Each must be either type "habit" (small recurring daily practice) or type "task" (one-time actionable item for this week).
- Include at least 1 habit and at least 1 task.
- Titles: short, specific, under 80 characters.
- Descriptions: 1-2 sentences, practical, not therapy-speak.
- Rationale: 1 sentence linking this item to their specific meaning/lesson (reference their words when possible).
- For tasks only, set "category" to one of: ${TASK_CATEGORIES.join(', ')}.
- Do not repeat the same idea twice.
- Items must be realistic, low-friction, and aligned with moving forward (not re-traumatizing or vague journaling unless they already chose that).
- Do not reference completed work; focus on forward momentum from their meanings.

SESSION CONTEXT:
${JSON.stringify(context, null, 2)}

Return JSON only:
{
  "recommendations": [
    {
      "id": "rec-1",
      "type": "habit",
      "title": "...",
      "description": "...",
      "rationale": "...",
      "category": "personal"
    }
  ]
}`

  const result = await generateText({
    model: defaultOpenaiModel(),
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
  })

  let parsed: { recommendations?: DashboardRecommendation[] } = {}
  try {
    parsed = JSON.parse(result.text)
  } catch {
    const match = result.text.match(/\{[\s\S]*\}/)
    if (match) parsed = JSON.parse(match[0])
  }

  const recs: DashboardRecommendation[] = (parsed.recommendations || [])
    .slice(0, 3)
    .map((r, i): DashboardRecommendation => {
      const type: DashboardRecommendation['type'] = r.type === 'task' ? 'task' : 'habit'
      return {
        id: r.id || `rec-${i + 1}`,
        type,
        title: String(r.title || '').trim(),
        description: String(r.description || '').trim(),
        rationale: String(r.rationale || '').trim(),
        category:
          type === 'task' &&
          TASK_CATEGORIES.includes(r.category as (typeof TASK_CATEGORIES)[number])
            ? (r.category as (typeof TASK_CATEGORIES)[number])
            : type === 'task'
              ? 'personal'
              : undefined,
      }
    })

  return recs.filter((r) => r.title.length > 0)
}

export async function applyDashboardRecommendations(
  userId: string,
  items: Array<Pick<DashboardRecommendation, 'type' | 'title' | 'description' | 'category'>>
) {
  if (items.length === 0 || items.length > 3) {
    throw new Error('Select between 1 and 3 items to add')
  }

  const supabase = await createClient()
  const created: { habits: unknown[]; tasks: unknown[] } = { habits: [], tasks: [] }

  for (const item of items) {
    if (item.type === 'habit') {
      const { data: lastHabit } = await supabase
        .from('daily_habits')
        .select('order_index')
        .eq('user_id', userId)
        .order('order_index', { ascending: false })
        .limit(1)
        .maybeSingle()

      const nextOrderIndex = lastHabit?.order_index != null ? lastHabit.order_index + 1 : 0
      const points = Math.floor(Math.random() * 26) + 25

      const { data: habit, error } = await supabase
        .from('daily_habits')
        .insert({
          user_id: userId,
          title: item.title.slice(0, 255),
          description: item.description || '',
          points_per_completion: points,
          is_active: true,
          order_index: nextOrderIndex,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)
      created.habits.push(habit)
    } else {
      const { data: maxSort } = await supabase
        .from('tasks')
        .select('sort_order')
        .eq('user_id', userId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()

      const category = TASK_CATEGORIES.includes(item.category as (typeof TASK_CATEGORIES)[number])
        ? item.category
        : 'personal'

      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          title: item.title.slice(0, 255),
          description: item.description || '',
          category,
          points_value: 5,
          money_value: 0,
          status: 'pending',
          sort_order: (maxSort?.sort_order || 0) + 1,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)
      created.tasks.push(task)
    }
  }

  return created
}
