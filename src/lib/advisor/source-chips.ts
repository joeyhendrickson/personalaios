import type { ModuleContextSummary } from '@/types/context-cache'

export type AdvisorSourceChip = {
  moduleId: string
  label: string
}

const MODULE_LABELS: Record<string, string> = {
  'fitness-tracker': 'Fitness',
  'budget-optimizer': 'Budget',
  'relationship-manager': 'Relationships',
  'day-trader': 'Trading',
  'grocery-optimizer': 'Groceries',
  'narrative-integration': 'I Am Present',
  'gratitude-journal': 'Gratitude',
  'focus-enhancer': 'Focus',
  'calendar-ai': 'Calendar',
  'dream-catcher': 'Dreams',
}

function moduleLabel(moduleId: string): string {
  if (MODULE_LABELS[moduleId]) return MODULE_LABELS[moduleId]
  return moduleId
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

export function buildAdvisorSourceChips(
  moduleContext: ModuleContextSummary[] | null | undefined,
  moduleIds: string[] | undefined,
  maxChips = 4
): AdvisorSourceChip[] {
  if (!moduleIds?.length || !moduleContext?.length) return []

  const chips: AdvisorSourceChip[] = []
  for (const moduleId of moduleIds) {
    const mod = moduleContext.find((m) => m.moduleId === moduleId && m.hasData)
    if (!mod) continue
    const fact =
      mod.objectiveFacts[0] || mod.recentHighlights[0] || mod.subjectiveNotes[0] || mod.aiSummary
    const suffix = fact ? ` · ${truncate(fact, 48)}` : ''
    chips.push({ moduleId, label: `${moduleLabel(moduleId)}${suffix}` })
    if (chips.length >= maxChips) break
  }
  return chips
}
