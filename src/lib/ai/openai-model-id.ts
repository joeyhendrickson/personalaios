/**
 * Default OpenAI chat model for text + vision (via AI SDK): `gpt-5.6-luna`.
 * Override with env **`OPENAI_MODEL`**.
 *
 * Fallback for RAG / Dream Catcher when the primary model is unavailable: `gpt-5.6-terra`.
 * Spoken chat (mic / TTS) uses **`gpt-realtime-2.1`**.
 * Progress-report covers use **`gpt-image-2`**.
 *
 * If the API returns **`model_not_found`**, this key is tied to your OpenAI **Project** (the id in the
 * error): that project is not allowed to use this model yet — fix in OpenAI (org/plan, model access,
 * or a key from a project that has GPT-5.6 enabled), not in this repo.
 */
export const OPENAI_DEFAULT_CHAT_MODEL_ID = 'gpt-5.6-luna' as const
export const OPENAI_FALLBACK_CHAT_MODEL_ID = 'gpt-5.6-terra' as const
export const OPENAI_REALTIME_MODEL_ID = 'gpt-realtime-2.1' as const
export const OPENAI_IMAGE_MODEL_ID = 'gpt-image-2' as const

export function resolveOpenAIModelId(): string {
  return process.env.OPENAI_MODEL?.trim() || OPENAI_DEFAULT_CHAT_MODEL_ID
}

export function resolveOpenAIFallbackModelId(): string {
  return process.env.OPENAI_FALLBACK_MODEL?.trim() || OPENAI_FALLBACK_CHAT_MODEL_ID
}

export function resolveOpenAIRealtimeModelId(): string {
  return process.env.OPENAI_REALTIME_MODEL?.trim() || OPENAI_REALTIME_MODEL_ID
}

export function resolveOpenAIImageModelId(): string {
  return process.env.OPENAI_IMAGE_MODEL?.trim() || OPENAI_IMAGE_MODEL_ID
}
