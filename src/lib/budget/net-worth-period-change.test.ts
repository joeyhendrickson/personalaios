import { describe, expect, it } from 'vitest'
import { netWorthChangeForPeriod, parseNetWorthPeriodChange } from './net-worth-period-change'

describe('netWorthChangeForPeriod', () => {
  const points = [
    { date: '2026-01-01', netWorth: 10000 },
    { date: '2026-02-01', netWorth: 12000 },
    { date: '2026-03-01', netWorth: 9000 },
  ]

  it('computes start vs end values for the window', () => {
    const change = netWorthChangeForPeriod(points, '2026-01-15', '2026-03-01')
    expect(change.startValue).toBe(10000)
    expect(change.endValue).toBe(9000)
    expect(change.change).toBe(-1000)
    expect(change.changePct).toBe(-10)
  })

  it('returns null change when there is no history', () => {
    const change = netWorthChangeForPeriod([], '2026-01-01', '2026-02-01')
    expect(change.change).toBeNull()
  })
})

describe('parseNetWorthPeriodChange', () => {
  it('reads a stored snapshot', () => {
    const parsed = parseNetWorthPeriodChange({
      startDate: '2026-01-01',
      endDate: '2026-02-01',
      startValue: 1,
      endValue: 2,
      change: 1,
      changePct: 100,
    })
    expect(parsed?.change).toBe(1)
  })
})
