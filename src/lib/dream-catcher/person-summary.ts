/** Structured snapshot of who the person is, their vision, and their goals. */

export type PersonSummary = {
  who_you_are: string
  vision: string
  goals: string[]
  narrative: string
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asGoalTitles(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object' && 'goal' in item) {
        return asString((item as { goal?: unknown }).goal)
      }
      if (item && typeof item === 'object' && 'title' in item) {
        return asString((item as { title?: unknown }).title)
      }
      return ''
    })
    .filter((title) => title.length > 0)
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
}

function firstParagraph(text: string): string {
  const parts = text
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
  return parts[0] || text.trim()
}

function pickText(...candidates: string[]): string {
  for (const candidate of candidates) {
    if (candidate.trim()) return candidate.trim()
  }
  return ''
}

export function isPersonSummary(value: unknown): value is PersonSummary {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.who_you_are === 'string' &&
    typeof v.vision === 'string' &&
    Array.isArray(v.goals) &&
    typeof v.narrative === 'string'
  )
}

export function parsePersonSummary(data: Record<string, unknown>): PersonSummary | null {
  if (isPersonSummary(data.person_summary)) {
    const stored = data.person_summary
    if (stored.narrative.trim() || stored.who_you_are.trim()) return stored
  }
  return null
}

/** Build (or refresh) the person / vision / goals summary stored with a Dream Catcher session. */
export function buildPersonSummary(data: Record<string, unknown>): PersonSummary {
  const existing = isPersonSummary(data.person_summary) ? data.person_summary : null
  const vision = pickText(asString(data.vision_statement), existing?.vision ?? '')
  const derivedGoals = asGoalTitles(data.goals_generated)
  const goals = derivedGoals.length ? derivedGoals : (existing?.goals ?? [])
  const life = asString(data.life_plan_summary)
  const insights = asStringList(data.personal_insights).slice(0, 3)
  const dreams = asStringList(data.dreams_discovered).slice(0, 3)

  const whoFromStories = [...insights, ...dreams].filter(Boolean).join(' ')
  const who_you_are = pickText(
    existing?.who_you_are ?? '',
    firstParagraph(life),
    whoFromStories,
    'Someone catching what matters and turning it into a life they can actually live.'
  )

  const goalLines = goals.length
    ? goals.map((g) => `• ${g}`).join('\n')
    : '• Goals will land on the dashboard with this plan.'

  const narrative = pickText(
    existing?.narrative ?? '',
    life,
    [who_you_are, vision ? `Vision: ${vision}` : '', `Goals:\n${goalLines}`]
      .filter(Boolean)
      .join('\n\n')
  )

  return { who_you_are, vision, goals, narrative }
}

export function mergePersonSummary(
  previous: unknown,
  incoming: unknown
): PersonSummary | undefined {
  const prev = isPersonSummary(previous) ? previous : null
  if (!isPersonSummary(incoming)) return prev ?? undefined
  return {
    who_you_are: pickText(incoming.who_you_are, prev?.who_you_are ?? ''),
    vision: pickText(incoming.vision, prev?.vision ?? ''),
    goals: incoming.goals.length ? asGoalTitles(incoming.goals) : (prev?.goals ?? []),
    narrative: pickText(incoming.narrative, prev?.narrative ?? ''),
  }
}

/** Attach a fresh person_summary onto assessment data before it is stored. */
export function withPersonSummary(data: Record<string, unknown>): Record<string, unknown> {
  const summary = buildPersonSummary(data)
  return {
    ...data,
    person_summary: summary,
    life_plan_summary: asString(data.life_plan_summary) || summary.narrative,
  }
}
