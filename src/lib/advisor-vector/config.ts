import { createHash } from 'crypto'
import { env } from '@/lib/env'

export const DEFAULT_PINECONE_INDEX = 'lifestacks-advisor'

export function isAdvisorRagEnabled(): boolean {
  if (process.env.ADVISOR_RAG_ENABLED === 'false') return false
  return Boolean(getPineconeApiKey() && getPineconeIndexName())
}

export function getPineconeApiKey(): string | undefined {
  return process.env.PINECONE_API_KEY?.trim() || undefined
}

export function getPineconeIndexName(): string {
  return process.env.PINECONE_INDEX_NAME?.trim() || DEFAULT_PINECONE_INDEX
}

export function advisorNamespace(userId: string): string {
  return userId
}

export function pineconeVectorId(userId: string, chunkId: string): string {
  const hash = createHash('sha256')
    .update(`${userId}:${chunkId}`, 'utf8')
    .digest('hex')
    .slice(0, 32)
  return `${userId.slice(0, 8)}_${hash}`
}

/** Minimum cosine similarity (0–1) to treat a retrieval as strong. */
export const STRONG_MATCH_SCORE = 0.75
export const DEFAULT_TOP_K = 10
export const MAX_RETRIEVED_IN_PROMPT = 8

export function getAdvisorRagConfigSummary() {
  return {
    enabled: isAdvisorRagEnabled(),
    indexName: getPineconeIndexName(),
    hasApiKey: Boolean(getPineconeApiKey()),
    hasOpenAiKey: Boolean(env.OPENAI_API_KEY?.trim()),
  }
}
