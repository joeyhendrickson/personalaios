/**
 * Default OpenAI chat model for text + vision (via AI SDK): GPT-5 mini (`gpt-5-mini`).
 * Override with env OPENAI_MODEL.
 */
export const OPENAI_DEFAULT_CHAT_MODEL_ID = 'gpt-5-mini' as const

export function resolveOpenAIModelId(): string {
  return process.env.OPENAI_MODEL?.trim() || OPENAI_DEFAULT_CHAT_MODEL_ID
}
