import type { ModuleContextSummary } from '@/types/context-cache'
import type {
  AdvisorConfidenceLevel,
  AdvisorEvidence,
  AdvisorModuleEvidence,
} from '@/types/advisor-evidence'
import type { FilterModulesResult } from '@/lib/ai-context/topic-module-filter'
import { moduleLabel } from '@/lib/advisor/source-chips'

function computeConfidence(input: {
  filterResult: FilterModulesResult
  modulesIncluded: string[]
  modulesForPrompt: ModuleContextSummary[]
  topicFilterApplied: boolean
  usedCache: boolean
  cacheAgeHours?: number
}): { level: AdvisorConfidenceLevel; score: number; rationale: string[] } {
  let score = 40
  const rationale: string[] = []

  if (!input.filterResult.isBroad && input.filterResult.detectedTopics.length > 0) {
    score += 25
    rationale.push(`Matched specific topics: ${input.filterResult.detectedTopics.join(', ')}.`)
  } else if (input.filterResult.isBroad) {
    rationale.push('Question was broad, so all available modules were considered.')
  } else {
    rationale.push('No strong topic keywords detected; used best-fit modules.')
  }

  const withFacts = input.modulesForPrompt.filter((m) => m.objectiveFacts.length > 0).length
  if (withFacts >= 2) {
    score += 20
    rationale.push(`${withFacts} modules had concrete facts to ground the answer.`)
  } else if (withFacts === 1) {
    score += 10
    rationale.push('One module had concrete facts; others were sparse.')
  } else {
    rationale.push('Limited factual module data for this turn.')
  }

  if (input.topicFilterApplied) {
    score += 10
    rationale.push('Topic filter focused context on relevant life modules.')
  }

  if (input.usedCache && (input.cacheAgeHours ?? 999) <= 24) {
    score += 10
    rationale.push('User context cache was fresh (under 24h).')
  } else if (input.usedCache) {
    rationale.push('Context came from cache but may be stale.')
  } else {
    rationale.push('Context was assembled live from current dashboard data.')
  }

  score = Math.max(0, Math.min(100, score))
  const level: AdvisorConfidenceLevel = score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low'
  return { level, score, rationale }
}

function buildRoutingSummary(filterResult: FilterModulesResult, moduleOrder: string[]): string {
  if (filterResult.isBroad) {
    return `Broad question — considered ${moduleOrder.length} installed module(s) with data.`
  }
  if (filterResult.detectedTopics.length) {
    return `Detected ${filterResult.detectedTopics.join(', ')} — routed to ${moduleOrder.join(', ') || 'dashboard only'}.`
  }
  return `Used top ${moduleOrder.length} module(s) with available data.`
}

export function buildAdvisorEvidence(input: {
  filterResult: FilterModulesResult
  allModuleContext: ModuleContextSummary[]
  modulesForPrompt: ModuleContextSummary[]
  modulesIncluded: string[]
  moduleOrder: string[]
  topicFilterApplied: boolean
  layersIncluded: string[]
  usedCache: boolean
  cacheAgeHours?: number
  contextAdjustments?: string
  appliedAdjustments?: string[]
}): AdvisorEvidence {
  const { level, score, rationale } = computeConfidence({
    filterResult: input.filterResult,
    modulesIncluded: input.modulesIncluded,
    modulesForPrompt: input.modulesForPrompt,
    topicFilterApplied: input.topicFilterApplied,
    usedCache: input.usedCache,
    cacheAgeHours: input.cacheAgeHours,
  })

  const includedSet = new Set(input.modulesIncluded)
  const orderIndex = new Map(input.moduleOrder.map((id, i) => [id, i]))

  const modules: AdvisorModuleEvidence[] = input.allModuleContext
    .filter((m) => m.hasData)
    .sort((a, b) => {
      const ai = orderIndex.get(a.moduleId) ?? 999
      const bi = orderIndex.get(b.moduleId) ?? 999
      return ai - bi
    })
    .map((m) => ({
      moduleId: m.moduleId,
      label: moduleLabel(m.moduleId),
      priorityRank: (orderIndex.get(m.moduleId) ?? 999) + 1,
      recordCount: m.recordCount,
      categories: m.categories,
      objectiveFacts: m.objectiveFacts.slice(0, 8),
      subjectiveNotes: m.subjectiveNotes.slice(0, 4),
      recentHighlights: m.recentHighlights.slice(0, 4),
      includedInPrompt: includedSet.has(m.moduleId),
    }))

  return {
    confidenceLevel: level,
    confidenceScore: score,
    confidenceRationale: rationale,
    routingSummary: buildRoutingSummary(input.filterResult, input.moduleOrder),
    detectedTopics: input.filterResult.detectedTopics,
    topicFilterApplied: input.topicFilterApplied,
    isBroadQuestion: input.filterResult.isBroad,
    modulesIncluded: input.modulesIncluded,
    moduleOrder: input.moduleOrder,
    modules,
    layersIncluded: input.layersIncluded,
    usedCache: input.usedCache,
    cacheAgeHours: input.cacheAgeHours,
    contextAdjustments: input.contextAdjustments,
    appliedAdjustments: input.appliedAdjustments,
  }
}

export function encodeAdvisorEvidenceHeader(evidence: AdvisorEvidence): string {
  return encodeURIComponent(JSON.stringify(evidence))
}

export function decodeAdvisorEvidenceHeader(header: string | null): AdvisorEvidence | null {
  if (!header) return null
  try {
    return JSON.parse(decodeURIComponent(header)) as AdvisorEvidence
  } catch {
    try {
      return JSON.parse(header) as AdvisorEvidence
    } catch {
      return null
    }
  }
}
