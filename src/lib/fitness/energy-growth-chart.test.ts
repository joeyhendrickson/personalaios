import { describe, expect, it } from 'vitest'
import {
  buildEnergyGrowthChart,
  fillMissingDays,
  groupEarnedPointsByDay,
  lastEnergyByDay,
  pctChangeFromBaseline,
} from './energy-growth-chart'

describe('energy growth helpers', () => {
  it('keeps the latest energy reading for each day', () => {
    expect(
      lastEnergyByDay([
        {
          recorded_at: '2026-08-01T08:00:00.000Z',
          contextual_energy_level_1_10: 4,
          energy_level_self_1_10: 3,
        },
        {
          recorded_at: '2026-08-01T20:00:00.000Z',
          contextual_energy_level_1_10: 6,
        },
        {
          recorded_at: '2026-08-02T12:00:00.000Z',
          energy_level_self_1_10: 7,
        },
      ])
    ).toEqual([
      { date: '2026-08-01', value: 6 },
      { date: '2026-08-02', value: 7 },
    ])
  })

  it('sums only earned points by day', () => {
    expect(
      groupEarnedPointsByDay([
        { points: 10, created_at: '2026-08-01T10:00:00.000Z' },
        { points: 15, created_at: '2026-08-01T18:00:00.000Z' },
        { points: -500, created_at: '2026-08-01T19:00:00.000Z' },
        { points: 20, created_at: '2026-08-02T09:00:00.000Z' },
      ])
    ).toEqual([
      { date: '2026-08-01', value: 25 },
      { date: '2026-08-02', value: 20 },
    ])
  })

  it('fills missing days with zero points', () => {
    expect(
      fillMissingDays([{ date: '2026-08-01', value: 10 }], '2026-08-01', '2026-08-03')
    ).toEqual([
      { date: '2026-08-01', value: 10 },
      { date: '2026-08-02', value: 0 },
      { date: '2026-08-03', value: 0 },
    ])
  })

  it('computes percent change from baseline', () => {
    expect(pctChangeFromBaseline(6, 5)).toBe(20)
    expect(pctChangeFromBaseline(0, 10)).toBe(-100)
    expect(pctChangeFromBaseline(10, 0)).toBeNull()
  })

  it('builds comparable energy, net worth, and daily points series', () => {
    const { rows, metaByTs } = buildEnergyGrowthChart({
      energy: [
        { date: '2026-08-01', value: 5 },
        { date: '2026-08-03', value: 6 },
      ],
      netWorth: [
        { date: '2026-08-01', value: 100000 },
        { date: '2026-08-03', value: 110000 },
      ],
      dailyPoints: [
        { date: '2026-08-01', value: 100 },
        { date: '2026-08-03', value: 150 },
      ],
      includeNetWorth: true,
      includePoints: true,
    })

    expect(rows[0]?.Energy).toBe(0)
    expect(rows[0]?.['Net Worth']).toBe(0)
    expect(rows[0]?.Points).toBe(0)

    const last = rows[rows.length - 1]
    expect(last?.Energy).toBe(20)
    expect(last?.['Net Worth']).toBe(10)
    expect(last?.Points).toBe(50)

    const lastMeta = metaByTs.get(last!.ts)
    expect(lastMeta?.get('Energy')?.value).toBe(6)
    expect(lastMeta?.get('Points')?.value).toBe(150)
  })
})
