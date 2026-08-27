import { describe, expect, it } from 'vitest'
import {
  OPENAI_DEFAULT_CHAT_MODEL_ID,
  OPENAI_FALLBACK_CHAT_MODEL_ID,
  OPENAI_IMAGE_MODEL_ID,
  OPENAI_REALTIME_MODEL_ID,
  resolveOpenAIFallbackModelId,
  resolveOpenAIImageModelId,
  resolveOpenAIModelId,
  resolveOpenAIRealtimeModelId,
} from './openai-model-id'

describe('OpenAI model ids', () => {
  it('defaults chat to gpt-5.6-luna', () => {
    expect(OPENAI_DEFAULT_CHAT_MODEL_ID).toBe('gpt-5.6-luna')
    const previous = process.env.OPENAI_MODEL
    delete process.env.OPENAI_MODEL
    expect(resolveOpenAIModelId()).toBe('gpt-5.6-luna')
    if (previous !== undefined) process.env.OPENAI_MODEL = previous
  })

  it('uses gpt-5.6-terra as the chat fallback', () => {
    expect(OPENAI_FALLBACK_CHAT_MODEL_ID).toBe('gpt-5.6-terra')
    expect(resolveOpenAIFallbackModelId()).toBe('gpt-5.6-terra')
  })

  it('uses gpt-realtime-2.1 for spoken chat', () => {
    expect(OPENAI_REALTIME_MODEL_ID).toBe('gpt-realtime-2.1')
    expect(resolveOpenAIRealtimeModelId()).toBe('gpt-realtime-2.1')
  })

  it('uses gpt-image-2 for generated images', () => {
    expect(OPENAI_IMAGE_MODEL_ID).toBe('gpt-image-2')
    expect(resolveOpenAIImageModelId()).toBe('gpt-image-2')
  })
})
