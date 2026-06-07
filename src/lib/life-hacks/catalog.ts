/**
 * Canonical Life Hacks shown on /modules (Life Hacks hub).
 * Keep AI Life Coach recommendations in sync with this list.
 */

export type LifeHackModule = {
  id: string
  title: string
  category: string
  description: string
  /** Short line for Life Coach prompt context */
  coachHint: string
}

export const LIFE_HACK_CATALOG: LifeHackModule[] = [
  {
    id: 'day-trader',
    title: 'Market Advisor',
    category: 'Finance',
    description: 'Advanced stock analysis and trading pattern detection with AI-powered insights.',
    coachHint: 'For financial growth and investment learning',
  },
  {
    id: 'budget-optimizer',
    title: 'Budget Advisor',
    category: 'Finance',
    description: 'Budget, income, and spending visibility, analysis, and optimization.',
    coachHint: 'For financial management and spending optimization',
  },
  {
    id: 'grocery-optimizer',
    title: 'Grocery Store Optimizer',
    category: 'Finance',
    description: 'AI-powered grocery receipt analysis and cost optimization.',
    coachHint: 'For reducing grocery costs and optimizing food spending',
  },
  {
    id: 'fitness-tracker',
    title: 'Fitness Tracker',
    category: 'Health',
    description: 'Workout and nutrition plans based on biometrics, energy, and stress.',
    coachHint: 'For health, wellness, energy, and recovery goals',
  },
  {
    id: 'relationship-manager',
    title: 'Relationship Manager',
    category: 'Social',
    description: 'Track friendships and outreach aligned with your goals and projects.',
    coachHint: 'For personal and professional relationship tracking',
  },
  {
    id: 'dating-manager',
    title: 'Dating Management',
    category: 'Social',
    description: 'Evaluate partners and date ideas aligned with the life you are building.',
    coachHint: 'For dating alignment with your goals and values',
  },
  {
    id: 'calendar-ai',
    title: 'Lifestacks Calendar',
    category: 'Productivity',
    description: 'Schedule tasks and habits into Google Calendar.',
    coachHint: 'For scheduling tasks and habits into Google Calendar',
  },
  {
    id: 'analytics-dashboard',
    title: 'Productivity Analyst',
    category: 'Analytics',
    description: 'Comprehensive view of your LifeStacks metrics.',
    coachHint: 'For data visualization and productivity insights',
  },
  {
    id: 'focus-enhancer',
    title: 'Focus Enhancer',
    category: 'Wellness',
    description: 'Screen time accountability aligned with your life goals.',
    coachHint: 'For focus, digital wellness, and concentration',
  },
  {
    id: 'dream-catcher',
    title: 'Dream Catcher',
    category: 'Wellness',
    description: 'Discover desires, create your vision, and generate actionable goals.',
    coachHint: 'For vision, dreams, creativity, and goal discovery',
  },
  {
    id: 'narrative-integration',
    title: 'I Am Present',
    category: 'Wellness',
    description: 'Make peace with the past and reduce blocks to productivity and wellbeing.',
    coachHint: 'For processing the past, stress, and emotional blocks',
  },
  {
    id: 'rewards-self-care',
    title: 'Rewards & Self-Care',
    category: 'Wellness',
    description: 'Redeem points for personal rewards and self-care milestones.',
    coachHint: 'For motivation, rewards, and sustainable self-care',
  },
  {
    id: 'gratitude-journal',
    title: 'Gratitude Journal',
    category: 'Wellness',
    description: 'Nightly gratitude practice with mood tracking and streaks.',
    coachHint: 'For gratitude, mood awareness, and emotional wellbeing',
  },
]

const byId = new Map(LIFE_HACK_CATALOG.map((m) => [m.id, m]))
const byTitle = new Map(LIFE_HACK_CATALOG.map((m) => [m.title.toLowerCase(), m]))

/** Retired or hallucinated module names → closest real Life Hack (or drop if null). */
const LEGACY_MODULE_ALIASES: Record<string, string | null> = {
  'mood tracker': 'gratitude-journal',
  'energy optimizer': 'fitness-tracker',
  'creativity boost': 'dream-catcher',
  'calendar ai': 'calendar-ai',
  'time blocker': null,
  'stress manager': null,
  'goal achiever': null,
  'sleep optimizer': null,
  'habit master': null,
  'learning tracker': null,
  'system optimizer': null,
  'security monitor': null,
  'life coach': 'ai-coach',
}

export function lifeHackById(id: string): LifeHackModule | undefined {
  return byId.get(id)
}

export function resolveLifeHackModule(name: string): LifeHackModule | null {
  const trimmed = name.trim()
  if (!trimmed) return null

  const lower = trimmed.toLowerCase()
  const direct = byTitle.get(lower)
  if (direct) return direct

  const aliasId = LEGACY_MODULE_ALIASES[lower]
  if (aliasId === null) return null
  if (aliasId) return byId.get(aliasId) ?? null

  const byIdMatch = byId.get(trimmed)
  if (byIdMatch) return byIdMatch

  return null
}

export function installedModuleIds(activeModules: Array<{ module_id: string }>): Set<string> {
  return new Set(activeModules.map((m) => m.module_id))
}

export function formatLifeHacksForCoachPrompt(installed: Set<string>): string {
  const lines = LIFE_HACK_CATALOG.filter((m) => !installed.has(m.id)).map(
    (m) => `- ${m.title}: ${m.coachHint}`
  )
  return lines.join('\n')
}

export type ModuleRecommendation = {
  module: string
  reason: string
  connection: string
}

export type ResolvedModuleRecommendation = ModuleRecommendation & {
  module_id: string
  href: string
}

export function filterModuleRecommendations(
  recommendations: ModuleRecommendation[] | undefined,
  installed: Set<string>
): ResolvedModuleRecommendation[] {
  if (!recommendations?.length) return []

  const seen = new Set<string>()
  const out: ResolvedModuleRecommendation[] = []

  for (const rec of recommendations) {
    const resolved = resolveLifeHackModule(rec.module)
    if (!resolved || installed.has(resolved.id) || seen.has(resolved.id)) continue
    if (resolved.id === 'ai-coach') continue

    seen.add(resolved.id)
    out.push({
      ...rec,
      module: resolved.title,
      module_id: resolved.id,
      href: `/modules/${resolved.id}`,
    })
  }

  return out
}
