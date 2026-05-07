/**
 * Default OpenAI chat model for text + vision (via AI SDK): `gpt-5-mini`.
 * Override with env **`OPENAI_MODEL`**.
 *
 * If the API returns **`model_not_found`**, this key is tied to your OpenAI **Project** (the id in the
 * error): that project is not allowed to use this model yet — fix in OpenAI (org/plan, model access,
 * or a key from a project that has GPT-5 enabled), not in this repo.
 */
export const OPENAI_DEFAULT_CHAT_MODEL_ID = 'gpt-5-mini' as const

export function resolveOpenAIModelId(): string {
  return process.env.OPENAI_MODEL?.trim() || OPENAI_DEFAULT_CHAT_MODEL_ID
}
