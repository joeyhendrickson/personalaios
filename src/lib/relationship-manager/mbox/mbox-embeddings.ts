import { createHash } from 'crypto'
import { env } from '@/lib/env'

const EMBEDDING_MODEL = 'text-embedding-3-small'
const MAX_CHARS = 8000

export function hashContent(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

function truncateForEmbedding(text: string): string {
  const t = text.trim()
  if (t.length <= MAX_CHARS) return t
  return t.slice(0, MAX_CHARS)
}

/** Returns 1536-dim vector or null if API missing / failure. */
export async function embedTextForMailbox(text: string): Promise<number[] | null> {
  const key = env.OPENAI_API_KEY?.trim()
  if (!key) return null

  const input = truncateForEmbedding(text)
  if (!input) return null

  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input,
        dimensions: 1536,
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { data?: { embedding?: number[] }[] }
    const vec = data.data?.[0]?.embedding
    return Array.isArray(vec) && vec.length === 1536 ? vec : null
  } catch {
    return null
  }
}

/** Postgres pgvector text format for PostgREST. */
export function vectorToPgString(vec: number[]): string {
  return `[${vec.join(',')}]`
}
