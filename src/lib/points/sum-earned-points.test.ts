import { describe, expect, it } from 'vitest'
import { sumEarnedPoints } from './sum-earned-points'

describe('sumEarnedPoints', () => {
  it('sums only positive ledger entries', () => {
    expect(
      sumEarnedPoints([{ points: 10 }, { points: -5005920 }, { points: 25 }, { points: 0 }])
    ).toBe(35)
  })

  it('returns 0 for empty or missing input', () => {
    expect(sumEarnedPoints([])).toBe(0)
    expect(sumEarnedPoints(null)).toBe(0)
  })
})
