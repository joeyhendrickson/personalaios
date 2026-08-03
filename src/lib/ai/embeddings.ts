import { env } from '@/lib/env'

export const EMBEDDING_MODEL = 'text-embedding-3-small'
export const EMBEDDING_DIMENSIONS = 1536
const MAX_CHARS = 8000

function truncateForEmbedding(text: string): string {
  const t = text.trim()
  if (t.length <= MAX_CHARS) return t
  return t.slice(0, MAX_CHARS)
}

/** Returns 1536-dim vector or null if API missing / failure. */
export async function embedText(text: string): Promise<number[] | null> {
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
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { data?: { embedding?: number[] }[] }
    const vec = data.data?.[0]?.embedding
    return Array.isArray(vec) && vec.length === EMBEDDING_DIMENSIONS ? vec : null
  } catch {
    return null
  }
}

/** Batch embed; returns null entries for failures. */
export async function embedTexts(texts: string[]): Promise<(number[] | null)[]> {
  const key = env.OPENAI_API_KEY?.trim()
  if (!key || texts.length === 0) return texts.map(() => null)

  const inputs = texts.map(truncateForEmbedding).filter(Boolean)
  if (inputs.length === 0) return texts.map(() => null)

  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: inputs,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    })
    if (!res.ok) return texts.map(() => null)
    const data = (await res.json()) as { data?: { embedding?: number[]; index?: number }[] }
    const out: (number[] | null)[] = texts.map(() => null)
    for (const row of data.data ?? []) {
      const idx = row.index ?? 0
      const vec = row.embedding
      if (Array.isArray(vec) && vec.length === EMBEDDING_DIMENSIONS) {
        out[idx] = vec
      }
    }
    return out
  } catch {
    return texts.map(() => null)
  }
}
