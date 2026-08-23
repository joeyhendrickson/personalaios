import { describe, expect, it } from 'vitest'
import { computeRewardsBalance } from './points-balance'

describe('computeRewardsBalance', () => {
  it('uses earned points only so a large reversal cannot wipe the Rewards banner', () => {
    const balance = computeRewardsBalance(
      [{ points: 1200 }, { points: -5000000 }, { points: 80 }, { points: 0 }],
      [500]
    )
    expect(balance.totalPoints).toBe(1280)
    expect(balance.totalRedeemed).toBe(500)
    expect(balance.currentPoints).toBe(780)
  })

  it('returns zero when there is no ledger', () => {
    expect(computeRewardsBalance(null, [])).toEqual({
      totalPoints: 0,
      totalRedeemed: 0,
      currentPoints: 0,
    })
  })
})
