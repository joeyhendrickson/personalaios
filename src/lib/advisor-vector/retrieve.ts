import 'server-only'

import { createAdminClient } from '@/lib/supabaseAdmin'
import { embedText } from '@/lib/ai/embeddings'
import { queryAdvisorVectors } from './client'
import {
  DEFAULT_TOP_K,
  isAdvisorRagEnabled,
  MAX_RETRIEVED_IN_PROMPT,
  STRONG_MATCH_SCORE,
} from './config'
import type { AdvisorRetrievedChunk, AdvisorVectorRetrieveResult } from './types'
import {
  retrieveAdvisorEvidenceMultiPass,
  type MultiPassRetrievalResult,
} from './multi-pass-retrieve'

async function logRetrieveEvent(input: {
  userId: string
  status: string
  chunksRetrieved: number
  latencyMs: number
  errorMessage?: string
}) {
  try {
    const supabase = createAdminClient()
    await supabase.from('advisor_rag_events').insert({
      user_id: input.userId,
      event_type: 'retrieve',
      status: input.status,
      chunks_retrieved: input.chunksRetrieved,
      latency_ms: input.latencyMs,
      error_message: input.errorMessage ?? null,
    })
  } catch {
    // non-blocking
  }
}

export async function retrieveAdvisorEvidence(input: {
  userId: string
  question: string
  moduleIds?: string[]
}): Promise<AdvisorVectorRetrieveResult> {
  const start = Date.now()

  if (!isAdvisorRagEnabled() || !input.question.trim()) {
    return { chunks: [], usedRag: false, latencyMs: Date.now() - start, indexFresh: false }
  }

  const supabase = createAdminClient()
  const { data: cacheRow } = await supabase
    .from('user_context_cache')
    .select('last_vector_index_at, vector_index_status, vector_chunk_count')
    .eq('user_id', input.userId)
    .single()

  let indexAgeHours: number | undefined
  let indexFresh = false
  if (cacheRow?.last_vector_index_at) {
    indexAgeHours =
      (Date.now() - new Date(cacheRow.last_vector_index_at as string).getTime()) / (1000 * 60 * 60)
    indexFresh = indexAgeHours <= 24 && cacheRow.vector_index_status === 'success'
  }

  try {
    const queryVector = await embedText(input.question)
    if (!queryVector) {
      return {
        chunks: [],
        usedRag: false,
        latencyMs: Date.now() - start,
        indexFresh,
        indexAgeHours,
      }
    }

    const matches = await queryAdvisorVectors(
      input.userId,
      queryVector,
      DEFAULT_TOP_K,
      input.moduleIds
    )

    const chunks: AdvisorRetrievedChunk[] = matches
      .slice(0, MAX_RETRIEVED_IN_PROMPT)
      .map((m, i) => ({
        chunkId: m.chunkId,
        label: m.label,
        moduleId: m.moduleId,
        sourceType: m.sourceType as AdvisorRetrievedChunk['sourceType'],
        preview: m.preview || m.label,
        score: m.score,
        includedInPrompt: i < MAX_RETRIEVED_IN_PROMPT && m.score >= 0.5,
      }))

    const latencyMs = Date.now() - start
    await logRetrieveEvent({
      userId: input.userId,
      status: 'success',
      chunksRetrieved: chunks.filter((c) => c.includedInPrompt).length,
      latencyMs,
    })

    return {
      chunks,
      usedRag: chunks.some((c) => c.includedInPrompt),
      latencyMs,
      indexFresh,
      indexAgeHours,
    }
  } catch (e) {
    const latencyMs = Date.now() - start
    const errMsg = e instanceof Error ? e.message : 'Retrieve failed'
    await logRetrieveEvent({
      userId: input.userId,
      status: 'failed',
      chunksRetrieved: 0,
      latencyMs,
      errorMessage: errMsg,
    })
    return { chunks: [], usedRag: false, latencyMs, indexFresh, indexAgeHours }
  }
}

export function countStrongMatches(chunks: AdvisorRetrievedChunk[]): number {
  return chunks.filter((c) => c.includedInPrompt && c.score >= STRONG_MATCH_SCORE).length
}

/**
 * Smart retrieval: Attempts single-pass first, upgrades to multi-pass if confidence is low.
 * This is the main entry point for all advisor retrievals.
 */
export async function retrieveAdvisorEvidenceSmart(input: {
  userId: string
  question: string
  moduleIds?: string[]
  forceMultiPass?: boolean
  confidenceThreshold?: number
}): Promise<AdvisorVectorRetrieveResult | MultiPassRetrievalResult> {
  const confidenceThreshold = input.confidenceThreshold ?? 0.8

  // Force multi-pass if requested
  if (input.forceMultiPass) {
    return await retrieveAdvisorEvidenceMultiPass({
      userId: input.userId,
      question: input.question,
      moduleIds: input.moduleIds,
      maxPasses: 3,
      confidenceThreshold,
    })
  }

  // Step 1: Try single-pass retrieval
  const singlePassResult = await retrieveAdvisorEvidence({
    userId: input.userId,
    question: input.question,
    moduleIds: input.moduleIds,
  })

  // Step 2: Assess quality
  const quality = assessRetrievalQuality(singlePassResult)

  // Step 3: If quality is low, upgrade to multi-pass
  if (quality < confidenceThreshold) {
    console.log(
      `[Smart RAG] Single-pass quality ${(quality * 100).toFixed(0)}% < ${(confidenceThreshold * 100).toFixed(0)}% threshold. Upgrading to multi-pass.`
    )

    return await retrieveAdvisorEvidenceMultiPass({
      userId: input.userId,
      question: input.question,
      moduleIds: input.moduleIds,
      maxPasses: 3,
      confidenceThreshold,
    })
  }

  // Single-pass was sufficient
  console.log(
    `[Smart RAG] Single-pass quality ${(quality * 100).toFixed(0)}% ≥ ${(confidenceThreshold * 100).toFixed(0)}% threshold. Using single-pass.`
  )
  return singlePassResult
}

/**
 * Assesses retrieval quality (0-1 scale) based on:
 * - Number of strong matches (>0.75)
 * - Average score
 * - Total chunks included in prompt
 */
function assessRetrievalQuality(result: AdvisorVectorRetrieveResult): number {
  if (!result.usedRag || result.chunks.length === 0) {
    return 0.3 // Low confidence when no retrieval
  }

  const includedChunks = result.chunks.filter((c) => c.includedInPrompt)
  if (includedChunks.length === 0) {
    return 0.4
  }

  const strongMatches = countStrongMatches(result.chunks)
  const avgScore =
    includedChunks.reduce((sum, c) => sum + c.score, 0) / includedChunks.length

  // Quality formula:
  // - 50% weight on strong match ratio
  // - 40% weight on average score
  // - 10% bonus for volume (up to 8 chunks)
  const strongRatio = strongMatches / includedChunks.length
  const volumeBonus = Math.min(includedChunks.length / 8, 1) * 0.1

  return Math.min(strongRatio * 0.5 + avgScore * 0.4 + volumeBonus, 1)
}
