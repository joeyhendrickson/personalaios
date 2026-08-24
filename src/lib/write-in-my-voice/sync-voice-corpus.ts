import 'server-only'

import { createAdminClient } from '@/lib/supabaseAdmin'
import { embedTexts } from '@/lib/ai/embeddings'
import { deleteAdvisorVectorsByIds, upsertAdvisorVectors } from '@/lib/advisor-vector/client'
import { isAdvisorRagEnabled, pineconeVectorId } from '@/lib/advisor-vector/config'
import { buildVoiceCorpusChunks } from './voice-chunks'
import type { VoiceProfile } from './types'

type LedgerRow = {
  chunk_id: string
  content_hash: string
  pinecone_id: string
  sample_id?: string | null
}

export async function syncVoiceCorpusToPinecone(input: {
  userId: string
  samples: Array<{ id: string; source_type: string; content_text: string; file_name: string }>
  voiceProfile?: VoiceProfile | null
}): Promise<{ upserted: number; deleted: number; skipped: boolean }> {
  if (!isAdvisorRagEnabled()) {
    return { upserted: 0, deleted: 0, skipped: true }
  }

  const supabase = createAdminClient()
  const chunks = buildVoiceCorpusChunks({
    samples: input.samples,
    voiceProfile: input.voiceProfile,
  })

  const { data: ledgerRows } = await supabase
    .from('write_in_my_voice_vector_ledger')
    .select('chunk_id, content_hash, pinecone_id, sample_id')
    .eq('user_id', input.userId)

  const ledger = (ledgerRows ?? []) as LedgerRow[]
  const ledgerByChunk = new Map(ledger.map((r) => [r.chunk_id, r]))
  const nextChunkIds = new Set(chunks.map((c) => c.chunkId))

  const toUpsert = chunks.filter((c) => {
    const existing = ledgerByChunk.get(c.chunkId)
    return !existing || existing.content_hash !== c.contentHash
  })

  const toDelete = ledger.filter((r) => !nextChunkIds.has(r.chunk_id))

  if (toUpsert.length > 0) {
    const vectors = await embedTexts(toUpsert.map((c) => c.text))
    const items = toUpsert
      .map((chunk, i) => {
        const values = vectors[i]
        return values ? { chunk, values } : null
      })
      .filter((x): x is { chunk: (typeof toUpsert)[0]; values: number[] } => x !== null)

    if (items.length > 0) {
      await upsertAdvisorVectors(input.userId, items)

      for (const { chunk } of items) {
        const sampleMatch = chunk.chunkId.match(/:sample:([^:]+):/)
        const sampleId = sampleMatch?.[1] ?? null
        await supabase.from('write_in_my_voice_vector_ledger').upsert(
          {
            user_id: input.userId,
            chunk_id: chunk.chunkId,
            content_hash: chunk.contentHash,
            pinecone_id: pineconeVectorId(input.userId, chunk.chunkId),
            sample_id: sampleId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,chunk_id' }
        )
      }
    }
  }

  if (toDelete.length > 0) {
    await deleteAdvisorVectorsByIds(
      input.userId,
      toDelete.map((r) => r.pinecone_id)
    )
    await supabase
      .from('write_in_my_voice_vector_ledger')
      .delete()
      .eq('user_id', input.userId)
      .in(
        'chunk_id',
        toDelete.map((r) => r.chunk_id)
      )
  }

  return { upserted: toUpsert.length, deleted: toDelete.length, skipped: false }
}

export async function deleteVoiceCorpusForSample(userId: string, sampleId: string): Promise<void> {
  const supabase = createAdminClient()
  const { data: rows } = await supabase
    .from('write_in_my_voice_vector_ledger')
    .select('chunk_id, pinecone_id')
    .eq('user_id', userId)
    .eq('sample_id', sampleId)

  if (!rows?.length) return

  if (isAdvisorRagEnabled()) {
    await deleteAdvisorVectorsByIds(
      userId,
      rows.map((r) => r.pinecone_id as string)
    )
  }

  await supabase
    .from('write_in_my_voice_vector_ledger')
    .delete()
    .eq('user_id', userId)
    .eq('sample_id', sampleId)
}
