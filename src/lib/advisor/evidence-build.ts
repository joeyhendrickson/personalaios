import 'server-only'

import type { ModuleContextSummary } from '@/types/context-cache'
import type {
  AdvisorConfidenceLevel,
  AdvisorEvidence,
  AdvisorModuleEvidence,
  AdvisorRetrievedEvidence,
} from '@/types/advisor-evidence'
import type { FilterModulesResult } from '@/lib/ai-context/topic-module-filter'
import { moduleLabel } from '@/lib/advisor/source-chips'
import { STRONG_MATCH_SCORE } from '@/lib/advisor-vector/config'
import type {
  AdvisorRetrievedChunk,
  MultiPassRetrievalResult,
  RetrievalPass,
} from '@/lib/advisor-vector/types'

function countStrongMatches(chunks: AdvisorRetrievedChunk[]): number {
  return chunks.filter((c) => c.includedInPrompt && c.score >= STRONG_MATCH_SCORE).length
}

function computeConfidence(input: {
  filterResult: FilterModulesResult
  modulesForPrompt: ModuleContextSummary[]
  topicFilterApplied: boolean
  usedCache: boolean
  cacheAgeHours?: number
  usedRag?: boolean
  ragIndexFresh?: boolean
  retrievedChunks?: AdvisorRetrievedChunk[]
}): { level: AdvisorConfidenceLevel; score: number; rationale: string[] } {
  let score = 35
  const rationale: string[] = []

  if (!input.filterResult.isBroad && input.filterResult.detectedTopics.length > 0) {
    score += 15
    rationale.push(`Matched specific topics: ${input.filterResult.detectedTopics.join(', ')}.`)
  } else if (input.filterResult.isBroad) {
    rationale.push('Question was broad, so all available modules were considered.')
  } else {
    rationale.push('No strong topic keywords detected; used best-fit modules.')
  }

  const withFacts = input.modulesForPrompt.filter((m) => m.objectiveFacts.length > 0).length
  if (withFacts >= 2) {
    score += 15
    rationale.push(`${withFacts} modules had concrete facts to ground the answer.`)
  } else if (withFacts === 1) {
    score += 8
    rationale.push('One module had concrete facts; others were sparse.')
  } else {
    rationale.push('Limited factual module data for this turn.')
  }

  if (input.topicFilterApplied) {
    score += 8
    rationale.push('Topic filter focused context on relevant life modules.')
  }

  if (input.usedCache && (input.cacheAgeHours ?? 999) <= 24) {
    score += 8
    rationale.push('User context cache was fresh (under 24h).')
  } else if (input.usedCache) {
    rationale.push('Context came from cache but may be stale.')
  } else {
    rationale.push('Context was assembled live from current dashboard data.')
  }

  const retrieved = input.retrievedChunks ?? []
  const strongMatches = countStrongMatches(retrieved)
  const includedCount = retrieved.filter((c) => c.includedInPrompt).length

  if (input.usedRag && strongMatches >= 3) {
    score += 25
    rationale.push(`Semantic search found ${strongMatches} strong matches in your indexed data.`)
  } else if (input.usedRag && includedCount >= 1) {
    score += 15
    rationale.push(`Retrieved ${includedCount} relevant item(s) from your knowledge index.`)
  } else if (input.usedRag) {
    score += 5
    rationale.push('RAG ran but matches were weak for this question.')
  }

  if (input.ragIndexFresh) {
    score += 8
    rationale.push('Your advisor memory index was synced within 24 hours.')
  } else if (input.usedRag) {
    rationale.push('Knowledge index may be stale — consider refreshing advisor memory.')
  }

  score = Math.max(0, Math.min(100, score))
  const level: AdvisorConfidenceLevel = score >= 80 ? 'high' : score >= 55 ? 'medium' : 'low'
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

function mapRetrievedChunks(chunks: AdvisorRetrievedChunk[]): AdvisorRetrievedEvidence[] {
  return chunks.map((c) => ({
    chunkId: c.chunkId,
    label: c.label,
    moduleId: c.moduleId,
    sourceType: c.sourceType,
    preview: c.preview,
    score: c.score,
    matchPercent: Math.round(c.score * 100),
    includedInPrompt: c.includedInPrompt,
  }))
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
  retrievedChunks?: AdvisorRetrievedChunk[]
  usedRag?: boolean
  ragIndexFresh?: boolean
  ragIndexAgeHours?: number
  multiPassResult?: MultiPassRetrievalResult
}): AdvisorEvidence {
  const { level, score, rationale } = computeConfidence({
    filterResult: input.filterResult,
    modulesForPrompt: input.modulesForPrompt,
    topicFilterApplied: input.topicFilterApplied,
    usedCache: input.usedCache,
    cacheAgeHours: input.cacheAgeHours,
    usedRag: input.usedRag,
    ragIndexFresh: input.ragIndexFresh,
    retrievedChunks: input.retrievedChunks,
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

  const evidence: AdvisorEvidence = {
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
    usedRag: input.usedRag,
    ragIndexFresh: input.ragIndexFresh,
    ragIndexAgeHours: input.ragIndexAgeHours,
    retrievedChunks: input.retrievedChunks?.length
      ? mapRetrievedChunks(input.retrievedChunks)
      : undefined,
  }

  // Add multi-pass metadata if applicable
  if (input.multiPassResult && 'passes' in input.multiPassResult) {
    ;(evidence as any).multiPass = {
      enabled: true,
      totalPasses: input.multiPassResult.passes.length,
      converged: input.multiPassResult.converged,
      convergenceReason: input.multiPassResult.convergenceReason,
      totalUniqueChunks: input.multiPassResult.totalNewChunks,
      passes: input.multiPassResult.passes.map((p) => ({
        passNumber: p.passNumber,
        query: p.query,
        queryRefinement: p.queryRefinement,
        newChunksFound: p.newChunksFound,
        strongMatches: p.strongMatches,
        avgScore: Math.round(p.avgScore * 100) / 100,
        durationMs: p.durationMs,
      })),
    }
  }

  return evidence
}
