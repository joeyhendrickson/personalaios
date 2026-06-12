import { describe, expect, it } from 'vitest'
import {
  formatAiCostUsd,
  normalizeAiCostMapForDisplay,
  normalizeAiCostUsdForDisplay,
} from './format-ai-cost-usd'

describe('normalizeAiCostUsdForDisplay', () => {
  it('shifts stored fractional costs two decimal places', () => {
    expect(normalizeAiCostUsdForDisplay(0.4392)).toBe(43.92)
    expect(normalizeAiCostUsdForDisplay('0.4392')).toBe(43.92)
    expect(normalizeAiCostUsdForDisplay(0.0012)).toBe(0.12)
  })

  it('returns null for missing or invalid values', () => {
    expect(normalizeAiCostUsdForDisplay(null)).toBeNull()
    expect(normalizeAiCostUsdForDisplay(undefined)).toBeNull()
    expect(normalizeAiCostUsdForDisplay('')).toBeNull()
  })
})

describe('formatAiCostUsd', () => {
  it('formats display-ready amounts as standard USD', () => {
    expect(formatAiCostUsd(43.92)).toBe('$43.92')
    expect(formatAiCostUsd('43.92')).toBe('$43.92')
  })

  it('returns em dash for missing values', () => {
    expect(formatAiCostUsd(null)).toBe('—')
    expect(formatAiCostUsd(undefined)).toBe('—')
  })
})

describe('normalizeAiCostMapForDisplay', () => {
  it('normalizes each map entry', () => {
    expect(normalizeAiCostMapForDisplay({ chat: 0.4392, budget: 0.0015 })).toEqual({
      chat: 43.92,
      budget: 0.15,
    })
  })
})
