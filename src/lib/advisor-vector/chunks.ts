import { hashContent } from '@/lib/relationship-manager/mbox/mbox-embeddings'
import type {
  CrossModuleInsightsSummary,
  DerivedInsightsSummary,
  ModuleContextSummary,
  StaticProfileSummary,
  StructuredStateSummary,
} from '@/types/context-cache'
import type { AdvisorVectorChunk, AdvisorVectorSourceType } from './types'

function chunk(
  chunkId: string,
  text: string,
  sourceType: AdvisorVectorSourceType,
  label: string,
  moduleId?: string
): AdvisorVectorChunk | null {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (!trimmed || trimmed.length < 8) return null
  return {
    chunkId,
    text: trimmed,
    contentHash: hashContent(trimmed),
    sourceType,
    label,
    moduleId,
  }
}

export function buildAdvisorVectorChunks(input: {
  staticProfile: StaticProfileSummary | null
  structuredState: StructuredStateSummary | null
  derivedInsights: DerivedInsightsSummary | null
  moduleContext: ModuleContextSummary[]
  crossModuleInsights: CrossModuleInsightsSummary | null
}): AdvisorVectorChunk[] {
  const out: AdvisorVectorChunk[] = []
  const seen = new Set<string>()

  const push = (c: AdvisorVectorChunk | null) => {
    if (!c || seen.has(c.chunkId)) return
    seen.add(c.chunkId)
    out.push(c)
  }

  const profile = input.staticProfile
  if (profile) {
    if (profile.visionStatement) {
      push(chunk('profile:vision', `Vision: ${profile.visionStatement}`, 'profile', 'Vision'))
    }
    if (profile.dreamsDiscovered?.length) {
      push(
        chunk(
          'profile:dreams',
          `Dreams: ${profile.dreamsDiscovered.join('; ')}`,
          'profile',
          'Dreams'
        )
      )
    }
    if (profile.personalityTraits?.length) {
      push(
        chunk(
          'profile:traits',
          `Personality traits: ${profile.personalityTraits.join(', ')}`,
          'profile',
          'Personality'
        )
      )
    }
    if (profile.blockingFactors?.length) {
      push(
        chunk(
          'profile:blocking',
          `Blocking factors: ${profile.blockingFactors.join('; ')}`,
          'profile',
          'Blocking factors'
        )
      )
    }
  }

  const state = input.structuredState
  if (state) {
    for (const g of state.topGoals.slice(0, 8)) {
      push(
        chunk(
          `dashboard:goal:${g.title.slice(0, 40)}`,
          `Goal: ${g.title} (${g.goalType ?? 'goal'}, ${g.progress})`,
          'dashboard',
          `Goal: ${g.title}`,
          'dashboard'
        )
      )
    }
    for (const p of (state.topDashboardProjects ?? []).slice(0, 8)) {
      push(
        chunk(
          `dashboard:project:${p.title.slice(0, 40)}`,
          `Project: ${p.title} (${p.progress})`,
          'dashboard',
          `Project: ${p.title}`,
          'dashboard'
        )
      )
    }
    for (const t of state.topTasks.slice(0, 10)) {
      push(
        chunk(
          `dashboard:task:${t.title.slice(0, 40)}`,
          `Task: ${t.title} [${t.status}]`,
          'dashboard',
          `Task: ${t.title}`,
          'dashboard'
        )
      )
    }
    for (const h of (state.topHabits ?? []).slice(0, 6)) {
      if (!h) continue
      push(
        chunk(
          `dashboard:habit:${h.slice(0, 40)}`,
          `Habit: ${h}`,
          'dashboard',
          `Habit: ${h}`,
          'dashboard'
        )
      )
    }
    for (const p of state.topPriorities.slice(0, 5)) {
      push(
        chunk(
          `dashboard:priority:${p.title.slice(0, 40)}`,
          `Priority: ${p.title}`,
          'dashboard',
          `Priority: ${p.title}`,
          'dashboard'
        )
      )
    }
  }

  const derived = input.derivedInsights
  if (derived?.overallProgress) {
    push(
      chunk(
        'derived:overall',
        `Overall progress: ${derived.overallProgress}`,
        'derived',
        'Overall progress'
      )
    )
  }
  if (derived?.recommendations?.length) {
    derived.recommendations.slice(0, 5).forEach((rec, i) => {
      push(chunk(`derived:rec:${i}`, `Recommendation: ${rec}`, 'derived', 'Recommendation'))
    })
  }

  for (const mod of input.moduleContext.filter((m) => m.hasData)) {
    const mid = mod.moduleId
    mod.objectiveFacts.slice(0, 12).forEach((fact, i) => {
      push(chunk(`${mid}:fact:${i}`, fact, 'module_fact', fact.slice(0, 60), mid))
    })
    mod.recentHighlights.slice(0, 6).forEach((item, i) => {
      push(chunk(`${mid}:highlight:${i}`, item, 'module_highlight', item.slice(0, 60), mid))
    })
    mod.subjectiveNotes.slice(0, 6).forEach((note, i) => {
      push(chunk(`${mid}:note:${i}`, note, 'module_note', note.slice(0, 60), mid))
    })
    if (mod.aiSummary) {
      push(chunk(`${mid}:summary`, mod.aiSummary, 'module_summary', `${mid} summary`, mid))
    }
  }

  for (const insight of input.crossModuleInsights?.insights ?? []) {
    push(
      chunk(
        `cross:${insight.id}`,
        `${insight.category}: ${insight.insight}`,
        'cross_module',
        insight.insight.slice(0, 60),
        insight.relatedModules[0]
      )
    )
  }

  return out
}

export function formatRetrievedChunksForPrompt(
  chunks: Array<{ label: string; preview: string; moduleId?: string; score: number }>
): string {
  if (!chunks.length) return ''
  const lines = chunks.map(
    (c, i) =>
      `[${i + 1}] ${c.label} (${c.moduleId ?? 'general'}, match ${Math.round(c.score * 100)}%): ${c.preview}`
  )
  return `RETRIEVED EVIDENCE (semantic search — cite only when relevant):\n${lines.join('\n')}`
}
