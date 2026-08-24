import { describe, expect, it } from 'vitest'
import { looksLikeCodeDump, sanitizeAnalysisText } from './sanitize-analysis-text'

describe('looksLikeCodeDump', () => {
  it('flags JSON objects and fenced code', () => {
    expect(looksLikeCodeDump('{"financial_health":{"score":70}}')).toBe(true)
    expect(looksLikeCodeDump('```json\n{"a":1}\n```')).toBe(true)
  })

  it('allows ordinary sentences', () => {
    expect(looksLikeCodeDump('Cash flow was positive this quarter.')).toBe(false)
  })
})

describe('sanitizeAnalysisText', () => {
  it('replaces dumps with the fallback', () => {
    expect(sanitizeAnalysisText('{"financial_health":{}}', 'Fallback sentence.')).toBe(
      'Fallback sentence.'
    )
    expect(sanitizeAnalysisText('Spending improved.', 'Fallback')).toBe('Spending improved.')
  })
})
