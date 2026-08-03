import 'server-only'

import { embedText } from '@/lib/ai/embeddings'
import { queryAdvisorVectors } from './client'
import { DEFAULT_TOP_K, STRONG_MATCH_SCORE } from './config'
import type { AdvisorRetrievedChunk, AdvisorVectorRetrieveResult } from './types'
import { createAdminClient } from '@/lib/supabaseAdmin'
import OpenAI from 'openai'

export type RetrievalPass = {
  passNumber: number
  query: string
  queryRefinement: string | null
  chunks: AdvisorRetrievedChunk[]
  newChunksFound: number
  strongMatches: number
  avgScore: number
  durationMs: number
}

export type MultiPassRetrievalResult = AdvisorVectorRetrieveResult & {
  passes: RetrievalPass[]
  totalNewChunks: number
  converged: boolean
  convergenceReason: 'max_passes' | 'no_new_chunks' | 'high_quality'
}

/**
 * Multi-pass RAG: Iteratively refines queries to retrieve comprehensive context.
 * Only runs when initial confidence is low.
 */
export async function retrieveAdvisorEvidenceMultiPass(input: {
  userId: string
  question: string
  moduleIds?: string[]
  maxPasses?: number
  confidenceThreshold?: number
}): Promise<MultiPassRetrievalResult> {
  const startTime = Date.now()
  const maxPasses = input.maxPasses ?? 3
  const confidenceThreshold = input.confidenceThreshold ?? 0.8

  const passes: RetrievalPass[] = []
  const allChunkIds = new Set<string>()
  const allChunks: AdvisorRetrievedChunk[] = []

  // Pass 1: Original query
  const pass1 = await executeRetrievalPass({
    userId: input.userId,
    query: input.question,
    passNumber: 1,
    moduleIds: input.moduleIds,
    seenChunkIds: allChunkIds,
    previousPasses: [],
  })

  passes.push(pass1)
  pass1.chunks.forEach((c) => {
    allChunkIds.add(c.chunkId)
    allChunks.push(c)
  })

  // Check if Pass 1 is already high quality
  const pass1Quality = calculatePassQuality(pass1)
  if (pass1Quality >= confidenceThreshold) {
    await logMultiPassEvent({
      userId: input.userId,
      question: input.question,
      passes,
      totalDurationMs: Date.now() - startTime,
      converged: true,
      convergenceReason: 'high_quality',
    })

    return buildMultiPassResult({
      passes,
      allChunks,
      totalDurationMs: Date.now() - startTime,
      converged: true,
      convergenceReason: 'high_quality',
    })
  }

  // Pass 2+: Refine queries based on what we found
  for (let passNum = 2; passNum <= maxPasses; passNum++) {
    const refinedQuery = await refineQueryBasedOnResults({
      originalQuestion: input.question,
      previousPasses: passes,
    })

    if (!refinedQuery || refinedQuery === passes[passes.length - 1].query) {
      // Query refinement failed or didn't change
      break
    }

    const pass = await executeRetrievalPass({
      userId: input.userId,
      query: refinedQuery,
      passNumber: passNum,
      moduleIds: input.moduleIds,
      seenChunkIds: allChunkIds,
      previousPasses: passes,
    })

    passes.push(pass)
    pass.chunks.forEach((c) => {
      if (!allChunkIds.has(c.chunkId)) {
        allChunkIds.add(c.chunkId)
        allChunks.push(c)
      }
    })

    // Early stopping: no new valuable chunks
    if (pass.newChunksFound === 0 && pass.strongMatches === 0) {
      await logMultiPassEvent({
        userId: input.userId,
        question: input.question,
        passes,
        totalDurationMs: Date.now() - startTime,
        converged: true,
        convergenceReason: 'no_new_chunks',
      })

      return buildMultiPassResult({
        passes,
        allChunks,
        totalDurationMs: Date.now() - startTime,
        converged: true,
        convergenceReason: 'no_new_chunks',
      })
    }
  }

  // Reached max passes
  await logMultiPassEvent({
    userId: input.userId,
    question: input.question,
    passes,
    totalDurationMs: Date.now() - startTime,
    converged: false,
    convergenceReason: 'max_passes',
  })

  return buildMultiPassResult({
    passes,
    allChunks,
    totalDurationMs: Date.now() - startTime,
    converged: false,
    convergenceReason: 'max_passes',
  })
}

async function executeRetrievalPass(input: {
  userId: string
  query: string
  passNumber: number
  moduleIds?: string[]
  seenChunkIds: Set<string>
  previousPasses: RetrievalPass[]
}): Promise<RetrievalPass> {
  const passStart = Date.now()

  const queryVector = await embedText(input.query)
  if (!queryVector) {
    return {
      passNumber: input.passNumber,
      query: input.query,
      queryRefinement: input.passNumber > 1 ? 'Embedding failed' : null,
      chunks: [],
      newChunksFound: 0,
      strongMatches: 0,
      avgScore: 0,
      durationMs: Date.now() - passStart,
    }
  }

  const matches = await queryAdvisorVectors(
    input.userId,
    queryVector,
    DEFAULT_TOP_K,
    input.moduleIds
  )

  const chunks: AdvisorRetrievedChunk[] = matches.map((m, i) => ({
    chunkId: m.chunkId,
    label: m.label,
    moduleId: m.moduleId,
    sourceType: m.sourceType as AdvisorRetrievedChunk['sourceType'],
    preview: m.preview || m.label,
    score: m.score,
    includedInPrompt: m.score >= 0.5,
  }))

  const newChunks = chunks.filter((c) => !input.seenChunkIds.has(c.chunkId))
  const strongMatches = chunks.filter((c) => c.score >= STRONG_MATCH_SCORE).length
  const avgScore = chunks.length > 0 ? chunks.reduce((sum, c) => sum + c.score, 0) / chunks.length : 0

  const refinement =
    input.passNumber > 1
      ? `Refined from pass ${input.passNumber - 1} (found ${input.previousPasses[input.passNumber - 2]?.chunks.length ?? 0} prev)`
      : null

  return {
    passNumber: input.passNumber,
    query: input.query,
    queryRefinement: refinement,
    chunks,
    newChunksFound: newChunks.length,
    strongMatches,
    avgScore,
    durationMs: Date.now() - passStart,
  }
}

async function refineQueryBasedOnResults(input: {
  originalQuestion: string
  previousPasses: RetrievalPass[]
}): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null

  const lastPass = input.previousPasses[input.previousPasses.length - 1]
  if (!lastPass || lastPass.chunks.length === 0) return null

  // Build summary of what we found
  const foundEvidence = lastPass.chunks
    .filter((c) => c.includedInPrompt)
    .slice(0, 5)
    .map((c) => `- ${c.label}: ${c.preview.slice(0, 100)}`)
    .join('\n')

  try {
    const openai = new OpenAI({ apiKey })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 80,
      messages: [
        {
          role: 'system',
          content:
            'You refine semantic search queries for personal productivity data. Given the original question and evidence found, generate ONE refined query (15 words max) to find missing context, alternative angles, or related information. Focus on gaps.',
        },
        {
          role: 'user',
          content: `Original: "${input.originalQuestion}"\n\nPass ${lastPass.passNumber} found:\n${foundEvidence}\n\nRefined query to find what's missing:`,
        },
      ],
    })

    const refined = completion.choices[0]?.message?.content?.trim()
    return refined && refined.length > 10 ? refined : null
  } catch (e) {
    console.error('[Multi-pass RAG] Query refinement failed:', e)
    return null
  }
}

function calculatePassQuality(pass: RetrievalPass): number {
  if (pass.chunks.length === 0) return 0
  
  const strongRatio = pass.strongMatches / Math.max(pass.chunks.length, 1)
  const avgScoreWeight = pass.avgScore
  const volumeBonus = Math.min(pass.chunks.filter(c => c.includedInPrompt).length / 8, 1) * 0.1
  
  return Math.min((strongRatio * 0.5 + avgScoreWeight * 0.4 + volumeBonus), 1)
}

function buildMultiPassResult(input: {
  passes: RetrievalPass[]
  allChunks: AdvisorRetrievedChunk[]
  totalDurationMs: number
  converged: boolean
  convergenceReason: 'max_passes' | 'no_new_chunks' | 'high_quality'
}): MultiPassRetrievalResult {
  // Sort by score, take best unique chunks
  const uniqueChunks = Array.from(
    new Map(input.allChunks.map((c) => [c.chunkId, c])).values()
  ).sort((a, b) => b.score - a.score)

  const includedChunks = uniqueChunks.filter((c) => c.includedInPrompt).slice(0, 12)
  const hasStrongMatch = includedChunks.some((c) => c.score >= STRONG_MATCH_SCORE)

  return {
    chunks: uniqueChunks,
    usedRag: includedChunks.length > 0,
    latencyMs: input.totalDurationMs,
    indexFresh: true, // Assume fresh for multi-pass
    passes: input.passes,
    totalNewChunks: uniqueChunks.length,
    converged: input.converged,
    convergenceReason: input.convergenceReason,
  }
}

async function logMultiPassEvent(input: {
  userId: string
  question: string
  passes: RetrievalPass[]
  totalDurationMs: number
  converged: boolean
  convergenceReason: string
}) {
  try {
    const supabase = createAdminClient()
    await supabase.from('advisor_rag_events').insert({
      user_id: input.userId,
      event_type: 'retrieve',
      status: 'success',
      chunks_retrieved: input.passes[input.passes.length - 1]?.chunks.length ?? 0,
      latency_ms: input.totalDurationMs,
      metadata: {
        multi_pass: true,
        total_passes: input.passes.length,
        converged: input.converged,
        convergence_reason: input.convergenceReason,
        total_unique_chunks: new Set(input.passes.flatMap((p) => p.chunks.map((c) => c.chunkId)))
          .size,
        pass_details: input.passes.map((p) => ({
          passNum: p.passNumber,
          query: p.query.slice(0, 100),
          newChunks: p.newChunksFound,
          strongMatches: p.strongMatches,
          avgScore: Math.round(p.avgScore * 100) / 100,
          durationMs: p.durationMs,
        })),
      },
    })
  } catch (e) {
    console.error('[Multi-pass RAG] Failed to log event:', e)
  }
}
