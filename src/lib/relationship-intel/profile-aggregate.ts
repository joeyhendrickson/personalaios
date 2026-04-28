import type { InteractionRow, PersonIntelligenceProfile, InteractionExtraction } from './types'

function asExtraction(raw: unknown): InteractionExtraction | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  if (!('emotional_tone' in e)) return null
  return raw as InteractionExtraction
}

/** Lines in notes that look like explicit trait bullets (user-authored only). */
export function traitsFromNotes(notes: string | null): string[] {
  if (!notes?.trim()) return []
  return notes
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^[-*•]\s+/.test(l) || /^\d+\.\s+/.test(l))
    .map((l) =>
      l
        .replace(/^[-*•]\s+/, '')
        .replace(/^\d+\.\s+/, '')
        .trim()
    )
    .filter((l) => l.length > 2 && l.length < 200)
}

/**
 * Read-only aggregate for Person Intelligence Profile (no new claims).
 */
export function buildPersonIntelligenceProfile(
  person: { name: string; notes: string | null; perceived_relationship_state: string },
  interactions: InteractionRow[]
): PersonIntelligenceProfile {
  const sorted = [...interactions].sort(
    (a, b) => new Date(a.interaction_at).getTime() - new Date(b.interaction_at).getTime()
  )

  const topicSet = new Set<string>()
  const shared: string[] = []
  let neg = 0
  let pos = 0
  let neu = 0

  for (const row of sorted) {
    const ex = asExtraction((row as { extraction?: unknown }).extraction)
    if (ex) {
      ex.topics_discussed.forEach((t) => topicSet.add(t))
      ex.shared_experience_snippets.forEach((s) => shared.push(s))
      if (ex.emotional_tone === 'negative') neg++
      else if (ex.emotional_tone === 'positive') pos++
      else neu++
    }
    if (row.type === 'hangout' || row.type === 'project') {
      topicSet.add(row.type === 'hangout' ? 'in-person time' : 'project collaboration')
    }
  }

  const toneSummary =
    pos + neg + neu === 0
      ? 'No tone tags yet (upload messages with extraction enabled).'
      : `Logged tones in window: ${pos} positive, ${neu} neutral, ${neg} negative (from your uploads only).`

  return {
    identity: { name: person.name, notes: person.notes },
    relationship_state: person.perceived_relationship_state,
    interaction_count: sorted.length,
    extracted: {
      topics_discussed: [...topicSet].slice(0, 40),
      shared_experience_snippets: [...new Set(shared)].slice(0, 25),
      behavioral_traits_from_notes: traitsFromNotes(person.notes),
      tone_summary: toneSummary,
    },
  }
}
