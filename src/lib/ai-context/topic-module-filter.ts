/**
 * Question-aware filtering: include only modules relevant to the user's topic.
 */
import type { CrossModuleInsightsSummary, ModuleContextSummary } from '@/types/context-cache'
import { getModuleCategories, MODULE_ADVISORY_CATEGORIES } from './module-mappings'

const TOPIC_KEYWORDS: Record<string, string[]> = {
  financial: [
    'money',
    'financial',
    'finance',
    'budget',
    'spend',
    'spending',
    'income',
    'expense',
    'debt',
    'save',
    'saving',
    'profit',
    'loss',
    'lost money',
    'afford',
    'broke',
    'cash flow',
    'revenue',
  ],
  trading: [
    'stock',
    'stocks',
    'trade',
    'trading',
    'market',
    'portfolio',
    'invest',
    'investment',
    'options',
    'ticker',
  ],
  emotional: [
    'feel',
    'feeling',
    'emotion',
    'anxious',
    'anxiety',
    'stress',
    'stressed',
    'sad',
    'depressed',
    'overwhelmed',
    'trauma',
    'grief',
    'lonely',
    'burnout',
    'rumination',
    'present',
  ],
  relationship: [
    'relationship',
    'friend',
    'family',
    'partner',
    'marry',
    'marriage',
    'dating',
    'date ',
    'breakup',
    'social',
  ],
  wellness: [
    'health',
    'wellness',
    'fitness',
    'workout',
    'exercise',
    'sleep',
    'energy',
    'biometric',
    'weight',
    'nutrition',
    'diet',
    'calorie',
  ],
  habits: ['habit', 'routine', 'discipline', 'consistency', 'streak'],
  gratitude: ['gratitude', 'thankful', 'grateful'],
  calendar: ['calendar', 'schedule', 'time block', 'plan my day', 'daily plan'],
  vision: ['vision', 'purpose', 'meaning', 'dream', 'life direction'],
  productivity: [
    'task',
    'project',
    'goal',
    'priority',
    'prioritize',
    'productive',
    'focus',
    'organize',
    'planning',
  ],
  grocery: ['grocery', 'food shop', 'receipt', 'groceries', 'meal prep'],
}

const BROAD_PHRASES = [
  'help me',
  'overall',
  'everything',
  'whole life',
  'life management',
  'how am i doing',
  'catch me up',
  'what should i',
  'general',
  'holistic',
]

const TOPIC_TO_MODULES: Record<string, string[]> = {
  financial: ['budget-optimizer', 'day-trader'],
  trading: ['day-trader', 'budget-optimizer'],
  emotional: [
    'narrative-integration',
    'focus-enhancer',
    'gratitude-journal',
    'relationship-manager',
    'dating-manager',
  ],
  relationship: ['relationship-manager', 'dating-manager', 'narrative-integration'],
  wellness: ['fitness-tracker', 'grocery-optimizer'],
  habits: ['habit-master', 'fitness-tracker'],
  gratitude: ['gratitude-journal'],
  calendar: ['calendar-ai'],
  vision: ['dream-catcher', 'narrative-integration'],
  productivity: ['calendar-ai', 'habit-master'],
  grocery: ['grocery-optimizer', 'budget-optimizer'],
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

export function detectQuestionTopics(message: string): string[] {
  const t = normalize(message)
  const topics: string[] = []
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some((k) => t.includes(k))) topics.push(topic)
  }
  return topics
}

export function isBroadQuestion(message: string): boolean {
  const t = normalize(message)
  if (t.length < 12) return true
  return BROAD_PHRASES.some((p) => t.includes(p))
}

export function modulesForTopics(topics: string[]): Set<string> {
  const ids = new Set<string>()
  for (const topic of topics) {
    for (const id of TOPIC_TO_MODULES[topic] ?? []) ids.add(id)
  }
  return ids
}

export interface FilterModulesResult {
  filtered: ModuleContextSummary[]
  includedModuleIds: string[]
  isBroad: boolean
  detectedTopics: string[]
}

export function applyModulePriority(
  summaries: ModuleContextSummary[],
  modulePriority: string[] | undefined
): ModuleContextSummary[] {
  if (!modulePriority?.length) return summaries
  const rank = new Map(modulePriority.map((id, i) => [id, i]))
  return [...summaries].sort((a, b) => {
    const ar = rank.has(a.moduleId) ? rank.get(a.moduleId)! : 1000 + summaries.indexOf(a)
    const br = rank.has(b.moduleId) ? rank.get(b.moduleId)! : 1000 + summaries.indexOf(b)
    return ar - br
  })
}

export function filterModulesForQuestion(
  userMessage: string | undefined,
  allSummaries: ModuleContextSummary[],
  options?: {
    currentModule?: string
    crossModuleInsights?: CrossModuleInsightsSummary | null
    maxModules?: number
    modulePriority?: string[]
  }
): FilterModulesResult {
  const withData = allSummaries.filter((s) => s.hasData)
  if (!withData.length) {
    return { filtered: [], includedModuleIds: [], isBroad: true, detectedTopics: [] }
  }

  const maxModules = options?.maxModules ?? 8
  const message = userMessage?.trim() ?? ''

  if (!message || isBroadQuestion(message)) {
    const filtered = applyModulePriority(withData, options?.modulePriority)
    return {
      filtered,
      includedModuleIds: filtered.map((s) => s.moduleId),
      isBroad: true,
      detectedTopics: [],
    }
  }

  const topics = detectQuestionTopics(message)
  const moduleIds = modulesForTopics(topics)

  if (options?.currentModule) moduleIds.add(options.currentModule)

  for (const insight of options?.crossModuleInsights?.insights ?? []) {
    for (const id of insight.relatedModules) moduleIds.add(id)
  }

  if (moduleIds.size === 0) {
    return {
      filtered: withData.slice(0, maxModules),
      includedModuleIds: withData.slice(0, maxModules).map((s) => s.moduleId),
      isBroad: false,
      detectedTopics: topics,
    }
  }

  let filtered = withData.filter((s) => moduleIds.has(s.moduleId))

  if (filtered.length === 0) {
    filtered = withData.slice(0, maxModules)
  } else if (filtered.length > maxModules) {
    filtered = filtered.slice(0, maxModules)
  }

  filtered = applyModulePriority(filtered, options?.modulePriority)

  return {
    filtered,
    includedModuleIds: filtered.map((s) => s.moduleId),
    isBroad: false,
    detectedTopics: topics,
  }
}

export function filterCrossModuleInsightsForQuestion(
  insights: CrossModuleInsightsSummary | null,
  detectedTopics: string[],
  isBroad: boolean
): CrossModuleInsightsSummary | null {
  if (!insights?.insights?.length || isBroad) return insights

  if (detectedTopics.length === 0) return insights

  const topicCategories = new Set<string>()
  for (const topic of detectedTopics) {
    for (const mod of TOPIC_TO_MODULES[topic] ?? []) {
      for (const cat of getModuleCategories(mod)) {
        topicCategories.add(cat.toLowerCase())
      }
    }
    topicCategories.add(topic)
  }

  const filtered = insights.insights.filter((i) => {
    const cat = i.category.toLowerCase()
    return (
      topicCategories.has(cat) ||
      [...topicCategories].some((t) => cat.includes(t) || t.includes(cat.split('/')[0] ?? ''))
    )
  })

  if (!filtered.length) return { ...insights, insights: insights.insights.slice(0, 4) }
  return { ...insights, insights: filtered }
}

export function formatTopicFilterNote(result: FilterModulesResult): string {
  if (result.isBroad || result.detectedTopics.length === 0) return ''
  return `TOPIC FILTER: Showing modules relevant to [${result.detectedTopics.join(', ')}]: ${result.includedModuleIds.join(', ')}. Other installed modules omitted for focus — mention if user needs broader context.`
}

export function allAdvisoryCategories(): string[] {
  const set = new Set<string>()
  for (const cats of Object.values(MODULE_ADVISORY_CATEGORIES)) {
    for (const c of cats) set.add(c)
  }
  return [...set]
}
