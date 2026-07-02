import type { AdvisorContextAdjustments } from '@/types/advisor-evidence'

const TOPIC_ALIASES: Record<string, string[]> = {
  wellness: ['health', 'wellness', 'fitness', 'workout', 'sleep', 'energy', 'body', 'exercise'],
  financial: ['finance', 'financial', 'money', 'budget', 'spending', 'income', 'expense', 'debt'],
  trading: ['trading', 'stocks', 'invest', 'portfolio', 'market'],
  emotional: ['emotion', 'mental', 'stress', 'anxiety', 'feelings', 'mind'],
  relationship: ['relationship', 'social', 'dating', 'family', 'friends', 'partner'],
  habits: ['habit', 'routine', 'discipline'],
  productivity: ['productivity', 'tasks', 'projects', 'goals', 'work', 'focus'],
  grocery: ['grocery', 'food', 'meals', 'nutrition', 'diet'],
  calendar: ['calendar', 'schedule', 'time'],
  vision: ['vision', 'purpose', 'dream'],
  gratitude: ['gratitude', 'thankful'],
}

const TOPIC_TO_MODULES: Record<string, string[]> = {
  wellness: ['fitness-tracker', 'grocery-optimizer'],
  financial: ['budget-optimizer', 'day-trader'],
  trading: ['day-trader', 'budget-optimizer'],
  emotional: ['narrative-integration', 'focus-enhancer', 'gratitude-journal'],
  relationship: ['relationship-manager', 'dating-manager'],
  habits: ['habit-master', 'fitness-tracker'],
  productivity: ['calendar-ai', 'habit-master'],
  grocery: ['grocery-optimizer', 'budget-optimizer'],
  calendar: ['calendar-ai'],
  vision: ['dream-catcher', 'narrative-integration'],
  gratitude: ['gratitude-journal'],
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

function resolveTopicPhrase(phrase: string): string | null {
  const p = normalize(phrase)
  for (const [topic, aliases] of Object.entries(TOPIC_ALIASES)) {
    if (p.includes(topic) || aliases.some((a) => p.includes(a))) return topic
  }
  return null
}

function modulesForTopics(topics: string[]): string[] {
  const ids: string[] = []
  for (const topic of topics) {
    for (const id of TOPIC_TO_MODULES[topic] ?? []) {
      if (!ids.includes(id)) ids.push(id)
    }
  }
  return ids
}

/**
 * Parse natural-language adjustments like "Prioritize my health over my finances today".
 */
export function parseContextAdjustments(raw: string | undefined): AdvisorContextAdjustments | null {
  const text = raw?.trim()
  if (!text) return null

  const prioritizeTopics: string[] = []
  const deprioritizeTopics: string[] = []
  const promptLines: string[] = []
  const appliedAdjustments: string[] = []

  const overMatch = text.match(
    /prioriti[sz]e\s+(.+?)\s+over\s+(.+?)(?:\.|,|$|\band\b|\btoday\b|\bthis\b)/i
  )
  if (overMatch) {
    const first = resolveTopicPhrase(overMatch[1])
    const second = resolveTopicPhrase(overMatch[2])
    if (first) prioritizeTopics.push(first)
    if (second) deprioritizeTopics.push(second)
    if (first || second) {
      appliedAdjustments.push(
        `User asked to weight ${first ?? 'first area'} ahead of ${second ?? 'second area'}.`
      )
    }
  }

  if (/recompute|recalculate|revise|adjust|update your (answer|response)/i.test(text)) {
    promptLines.push(
      'The user reviewed your routing evidence and wants a revised answer. Apply their adjustment instructions below before answering.'
    )
  }

  if (prioritizeTopics.length || deprioritizeTopics.length) {
    promptLines.push(
      `USER CONTEXT PRIORITY (this turn): Weight ${prioritizeTopics.join(', ') || 'requested areas'} more heavily than ${deprioritizeTopics.join(', ') || 'other areas'}. Read module data in that order when reasoning.`
    )
  }

  promptLines.push(`USER ADJUSTMENT NOTE: ${text}`)

  const boostModules = modulesForTopics(prioritizeTopics)
  const lowerModules = modulesForTopics(deprioritizeTopics)
  const modulePriority = [...boostModules, ...lowerModules]

  return {
    raw: text,
    prioritizeTopics,
    deprioritizeTopics,
    modulePriority,
    promptLines,
  }
}

export function formatContextAdjustmentsPrompt(
  adjustments: AdvisorContextAdjustments | null
): string {
  if (!adjustments?.promptLines.length) return ''
  return adjustments.promptLines.join('\n')
}
