import OpenAI from 'openai'
import { env } from './env'

let cachedClient: OpenAI | null = null

/** Lazy OpenAI client — do not instantiate at module load (breaks `next build` without env). */
export function getOpenAIClient(): OpenAI {
  const apiKey = env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('OpenAI API key not configured')
  }
  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey })
  }
  return cachedClient
}
