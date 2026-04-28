import 'server-only'

import { openai } from '@ai-sdk/openai'
import { resolveOpenAIModelId } from '@/lib/ai/openai-model-id'

/** Use for generateText / streamText `model` across the app unless a route needs a different model. */
export function defaultOpenaiModel() {
  return openai(resolveOpenAIModelId())
}
