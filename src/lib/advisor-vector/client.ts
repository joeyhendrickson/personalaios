import 'server-only'

import { Pinecone } from '@pinecone-database/pinecone'
import {
  advisorNamespace,
  getPineconeApiKey,
  getPineconeIndexName,
  isAdvisorRagEnabled,
  pineconeVectorId,
} from './config'
import type { AdvisorVectorChunk } from './types'

let pineconeClient: Pinecone | null = null

function getClient(): Pinecone | null {
  if (!isAdvisorRagEnabled()) return null
  const apiKey = getPineconeApiKey()
  if (!apiKey) return null
  if (!pineconeClient) {
    pineconeClient = new Pinecone({ apiKey })
  }
  return pineconeClient
}

function getIndex() {
  const client = getClient()
  if (!client) return null
  return client.index(getPineconeIndexName())
}

export async function pingPinecone(): Promise<{ ok: boolean; error?: string }> {
  try {
    const index = getIndex()
    if (!index) return { ok: false, error: 'Pinecone not configured' }
    await index.describeIndexStats()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Pinecone ping failed' }
  }
}

export async function getPineconeIndexStats(): Promise<{
  totalVectorCount?: number
  namespaces?: Record<string, { recordCount?: number }>
} | null> {
  try {
    const index = getIndex()
    if (!index) return null
    const stats = await index.describeIndexStats()
    return {
      totalVectorCount: stats.totalRecordCount,
      namespaces: stats.namespaces as Record<string, { recordCount?: number }> | undefined,
    }
  } catch {
    return null
  }
}

export async function upsertAdvisorVectors(
  userId: string,
  items: Array<{ chunk: AdvisorVectorChunk; values: number[] }>
): Promise<void> {
  const index = getIndex()
  if (!index || items.length === 0) return

  const ns = advisorNamespace(userId)
  const batchSize = 100

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    await index.namespace(ns).upsert(
      batch.map(({ chunk, values }) => ({
        id: pineconeVectorId(userId, chunk.chunkId),
        values,
        metadata: {
          user_id: userId,
          chunk_id: chunk.chunkId,
          module_id: chunk.moduleId ?? '',
          source_type: chunk.sourceType,
          label: chunk.label.slice(0, 200),
          preview: chunk.text.slice(0, 500),
          content_hash: chunk.contentHash,
        },
      }))
    )
  }
}

export async function deleteAdvisorVectorsByIds(
  userId: string,
  pineconeIds: string[]
): Promise<void> {
  const index = getIndex()
  if (!index || pineconeIds.length === 0) return
  await index.namespace(advisorNamespace(userId)).deleteMany(pineconeIds)
}

export async function deleteAdvisorUserNamespace(userId: string): Promise<void> {
  const index = getIndex()
  if (!index) return
  await index.namespace(advisorNamespace(userId)).deleteAll()
}

export type PineconeQueryMatch = {
  chunkId: string
  label: string
  moduleId?: string
  sourceType: string
  preview: string
  score: number
}

export async function queryAdvisorVectors(
  userId: string,
  queryVector: number[],
  topK: number,
  moduleIds?: string[]
): Promise<PineconeQueryMatch[]> {
  const index = getIndex()
  if (!index) return []

  const filter: Record<string, unknown> = { user_id: { $eq: userId } }
  if (moduleIds?.length === 1) {
    filter.module_id = { $eq: moduleIds[0] }
  }

  try {
    const result = await index.namespace(advisorNamespace(userId)).query({
      vector: queryVector,
      topK,
      includeMetadata: true,
      filter,
    })

    const matches: PineconeQueryMatch[] = []
    for (const m of result.matches ?? []) {
      const meta = m.metadata as Record<string, unknown> | undefined
      const metaUserId = typeof meta?.user_id === 'string' ? meta.user_id : ''
      if (metaUserId && metaUserId !== userId) continue

      const chunkId = typeof meta?.chunk_id === 'string' ? meta.chunk_id : ''
      if (!chunkId) continue

      matches.push({
        chunkId,
        label: typeof meta?.label === 'string' ? meta.label : chunkId,
        moduleId:
          typeof meta?.module_id === 'string' && meta.module_id ? meta.module_id : undefined,
        sourceType: typeof meta?.source_type === 'string' ? meta.source_type : 'module_fact',
        preview: typeof meta?.preview === 'string' ? meta.preview : '',
        score: m.score ?? 0,
      })
    }

    if (moduleIds && moduleIds.length > 1) {
      const allowed = new Set(moduleIds)
      return matches.filter(
        (m) => !m.moduleId || allowed.has(m.moduleId) || m.moduleId === 'dashboard'
      )
    }

    return matches
  } catch (error) {
    console.error('[Advisor RAG] Pinecone query failed:', error)
    return []
  }
}
