import { describe, expect, it } from 'vitest'
import { shouldUpgradeToMultiPass } from './should-upgrade-multipass'
import type { AdvisorRetrievedChunk, AdvisorVectorRetrieveResult } from './types'

function chunk(overrides: Partial<AdvisorRetrievedChunk> = {}): AdvisorRetrievedChunk {
  return {
    chunkId: 'c1',
    label: 'Goals',
    sourceType: 'dashboard',
    preview: 'Goal progress',
    score: 0.6,
    includedInPrompt: true,
    ...overrides,
  }
}

function result(overrides: Partial<AdvisorVectorRetrieveResult> = {}): AdvisorVectorRetrieveResult {
  return {
    chunks: [],
    usedRag: false,
    latencyMs: 10,
    indexFresh: false,
    ...overrides,
  }
}

describe('shouldUpgradeToMultiPass', () => {
  it('does not upgrade when RAG is unused or empty', () => {
    expect(shouldUpgradeToMultiPass(result())).toBe(false)
    expect(
      shouldUpgradeToMultiPass(
        result({
          usedRag: false,
          chunks: [chunk()],
        })
      )
    ).toBe(false)
  })

  it('upgrades when the first pass found weak but usable chunks', () => {
    expect(
      shouldUpgradeToMultiPass(
        result({
          usedRag: true,
          chunks: [chunk({ score: 0.55 }), chunk({ chunkId: 'c2', score: 0.52 })],
        })
      )
    ).toBe(true)
  })

  it('keeps a strong first pass on single-pass', () => {
    expect(
      shouldUpgradeToMultiPass(
        result({
          usedRag: true,
          chunks: [
            chunk({ score: 0.91 }),
            chunk({ chunkId: 'c2', score: 0.88 }),
            chunk({ chunkId: 'c3', score: 0.86 }),
          ],
        })
      )
    ).toBe(false)
  })
})
