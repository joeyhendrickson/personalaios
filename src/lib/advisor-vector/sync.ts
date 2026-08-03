import 'server-only'

import { createAdminClient } from '@/lib/supabaseAdmin'
import { embedTexts } from '@/lib/ai/embeddings'
import { buildAdvisorVectorChunks } from './chunks'
import {
  deleteAdvisorUserNamespace,
  deleteAdvisorVectorsByIds,
  upsertAdvisorVectors,
} from './client'
import { isAdvisorRagEnabled, pineconeVectorId } from './config'
import type {
  CrossModuleInsightsSummary,
  DerivedInsightsSummary,
  ModuleContextSummary,
  StaticProfileSummary,
  StructuredStateSummary,
} from '@/types/context-cache'
import type { AdvisorVectorSyncResult } from './types'

type LedgerRow = {
  chunk_id: string
  content_hash: string
  pinecone_id: string
}

async function logRagEvent(input: {
  userId: string
  status: string
  chunksUpserted?: number
  chunksDeleted?: number
  latencyMs?: number
  errorMessage?: string
}) {
  try {
    const supabase = createAdminClient()
    await supabase.from('advisor_rag_events').insert({
      user_id: input.userId,
      event_type: 'sync',
      status: input.status,
      chunks_upserted: input.chunksUpserted ?? 0,
      chunks_deleted: input.chunksDeleted ?? 0,
      latency_ms: input.latencyMs ?? null,
      error_message: input.errorMessage ?? null,
    })
  } catch {
    // non-blocking
  }
}

export async function syncUserAdvisorVectors(
  userId: string,
  input: {
    staticProfile: StaticProfileSummary | null
    structuredState: StructuredStateSummary | null
    derivedInsights: DerivedInsightsSummary | null
    moduleContext: ModuleContextSummary[]
    crossModuleInsights: CrossModuleInsightsSummary | null
    sourceChecksum?: string
    route?: string
  }
): Promise<AdvisorVectorSyncResult> {
  const start = Date.now()

  if (!isAdvisorRagEnabled()) {
    return {
      success: true,
      skipped: true,
      skipReason: 'Advisor RAG disabled or Pinecone not configured',
      chunksUpserted: 0,
      chunksDeleted: 0,
      totalChunks: 0,
      durationMs: Date.now() - start,
    }
  }

  const supabase = createAdminClient()
  const chunks = buildAdvisorVectorChunks(input)

  await supabase.from('user_context_cache').upsert(
    {
      user_id: userId,
      vector_index_status: 'running',
      vector_index_error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  try {
    const { data: existingRows } = await supabase
      .from('user_vector_index')
      .select('chunk_id, content_hash, pinecone_id')
      .eq('user_id', userId)

    const ledger = (existingRows ?? []) as LedgerRow[]
    const ledgerByChunk = new Map(ledger.map((r) => [r.chunk_id, r]))
    const desiredIds = new Set(chunks.map((c) => c.chunkId))

    const toUpsert = chunks.filter(
      (c) => ledgerByChunk.get(c.chunkId)?.content_hash !== c.contentHash
    )
    const toDelete = ledger.filter((r) => !desiredIds.has(r.chunk_id))

    let upserted = 0
    if (toUpsert.length > 0) {
      const embeddings = await embedTexts(toUpsert.map((c) => c.text))
      const withVectors: Array<{ chunk: (typeof toUpsert)[number]; values: number[] }> = []
      for (let i = 0; i < toUpsert.length; i++) {
        const values = embeddings[i]
        if (values) withVectors.push({ chunk: toUpsert[i], values })
      }

      if (withVectors.length > 0) {
        await upsertAdvisorVectors(userId, withVectors)
        upserted = withVectors.length

        const now = new Date().toISOString()
        for (const { chunk } of withVectors) {
          await supabase.from('user_vector_index').upsert(
            {
              user_id: userId,
              chunk_id: chunk.chunkId,
              content_hash: chunk.contentHash,
              module_id: chunk.moduleId ?? null,
              source_type: chunk.sourceType,
              label: chunk.label.slice(0, 200),
              pinecone_id: pineconeVectorId(userId, chunk.chunkId),
              updated_at: now,
            },
            { onConflict: 'user_id,chunk_id' }
          )
        }
      }
    }

    let deleted = 0
    if (toDelete.length > 0) {
      await deleteAdvisorVectorsByIds(
        userId,
        toDelete.map((r) => r.pinecone_id)
      )
      await supabase
        .from('user_vector_index')
        .delete()
        .eq('user_id', userId)
        .in(
          'chunk_id',
          toDelete.map((r) => r.chunk_id)
        )
      deleted = toDelete.length
    }

    const now = new Date().toISOString()
    await supabase.from('user_context_cache').upsert(
      {
        user_id: userId,
        vector_index_status: 'success',
        vector_index_error: null,
        last_vector_index_at: now,
        vector_chunk_count: chunks.length,
        vector_index_checksum: input.sourceChecksum ?? null,
        updated_at: now,
      },
      { onConflict: 'user_id' }
    )

    const durationMs = Date.now() - start
    await logRagEvent({
      userId,
      status: 'success',
      chunksUpserted: upserted,
      chunksDeleted: deleted,
      latencyMs: durationMs,
    })

    return {
      success: true,
      chunksUpserted: upserted,
      chunksDeleted: deleted,
      totalChunks: chunks.length,
      durationMs,
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Vector sync failed'
    const durationMs = Date.now() - start

    await supabase.from('user_context_cache').upsert(
      {
        user_id: userId,
        vector_index_status: 'failed',
        vector_index_error: errMsg,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    await logRagEvent({
      userId,
      status: 'failed',
      latencyMs: durationMs,
      errorMessage: errMsg,
    })

    return {
      success: false,
      chunksUpserted: 0,
      chunksDeleted: 0,
      totalChunks: 0,
      durationMs,
      error: errMsg,
    }
  }
}

export async function deleteUserAdvisorVectors(userId: string): Promise<void> {
  if (!isAdvisorRagEnabled()) return
  const supabase = createAdminClient()
  await deleteAdvisorUserNamespace(userId)
  await supabase.from('user_vector_index').delete().eq('user_id', userId)
  await supabase
    .from('user_context_cache')
    .update({
      vector_index_status: 'idle',
      vector_chunk_count: 0,
      vector_index_checksum: null,
      last_vector_index_at: null,
      vector_index_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
}
