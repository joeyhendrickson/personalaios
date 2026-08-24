import { describe, expect, it } from 'vitest'
import { computeDrinkSavings } from './savings'
import { computeSoberStreak, addDays } from './streak'
import { classifyDrinkingPlace, groupPlaceMatches } from './bar-detection'
import { buildAfterDrinkBiometrics, describeCorrelation } from './after-drink-biometrics'
import { evaluateEarnedBadgeIds } from './badges'

describe('computeDrinkSavings', () => {
  it('computes daily, weekly, and saved totals from typical spend', () => {
    const result = computeDrinkSavings({
      typicalDrinkCost: 10,
      typicalDrinksPerWeek: 7,
      soberDayCount: 10,
    })
    expect(result.weeklyCost).toBe(70)
    expect(result.dailyCost).toBe(10)
    expect(result.savedToDate).toBe(100)
    expect(result.fromSoberDays).toBe(100)
    expect(result.fromRestaurantVisits).toBe(0)
  })

  it('adds restaurant visit savings for selected sober outings', () => {
    const result = computeDrinkSavings({
      typicalDrinkCost: 8,
      typicalDrinksPerWeek: 7,
      soberDayCount: 0,
      typicalDrinksPerOuting: 2,
      restaurantPlaces: [
        { visit_count: 3, counts_as_sober_outing: true },
        { visit_count: 10, counts_as_sober_outing: false },
        { visit_count: 1, counts_as_sober_outing: true },
      ],
    })
    expect(result.restaurant.visitCount).toBe(4)
    expect(result.restaurant.drinksAvoided).toBe(8)
    expect(result.fromRestaurantVisits).toBe(64)
    expect(result.savedToDate).toBe(64)
  })

  it('treats invalid numbers as zero', () => {
    const result = computeDrinkSavings({
      typicalDrinkCost: Number.NaN,
      typicalDrinksPerWeek: -4,
      soberDayCount: 3,
    })
    expect(result.savedToDate).toBe(0)
    expect(result.weeklyCost).toBe(0)
  })
})

describe('computeSoberStreak', () => {
  it('counts consecutive sober days ending today', () => {
    const streak = computeSoberStreak(
      [
        { log_date: '2026-08-13', drank: false },
        { log_date: '2026-08-12', drank: false },
        { log_date: '2026-08-11', drank: false },
        { log_date: '2026-08-10', drank: true },
      ],
      '2026-08-13'
    )
    expect(streak).toBe(3)
  })

  it('allows yesterday as the streak start if today is not logged', () => {
    const streak = computeSoberStreak(
      [
        { log_date: '2026-08-12', drank: false },
        { log_date: '2026-08-11', drank: false },
      ],
      '2026-08-13'
    )
    expect(streak).toBe(2)
  })

  it('breaks on a missing day', () => {
    const streak = computeSoberStreak(
      [
        { log_date: '2026-08-13', drank: false },
        { log_date: '2026-08-11', drank: false },
      ],
      '2026-08-13'
    )
    expect(streak).toBe(1)
  })
})

describe('addDays', () => {
  it('crosses month boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('classifyDrinkingPlace', () => {
  it('flags bars from merchant names', () => {
    const match = classifyDrinkingPlace({
      id: '1',
      date: '2026-08-01',
      merchant_name: "Joe's Sports Bar",
      amount: 42,
    })
    expect(match?.category).toBe('bar')
    expect(match?.confidence).toBe('high')
  })

  it('flags nightlife categories', () => {
    const match = classifyDrinkingPlace({
      id: '2',
      date: '2026-08-02',
      name: 'Downtown Spot',
      category: ['Food and Drink', 'Nightlife'],
      amount: 18,
    })
    expect(match?.category).toBe('bar')
  })

  it('treats restaurants as confirmable, not automatic bars', () => {
    const match = classifyDrinkingPlace({
      id: '3',
      merchant_name: 'River Bistro',
      category: ['Restaurants'],
      amount: 55,
    })
    expect(match?.category).toBe('restaurant')
    expect(match?.confidence).toBe('medium')
  })

  it('ignores grocery and gas', () => {
    expect(
      classifyDrinkingPlace({ merchant_name: 'Shell Gas', category: ['Gas Stations'], amount: 40 })
    ).toBeNull()
  })
})

describe('groupPlaceMatches', () => {
  it('rolls visits up by merchant', () => {
    const grouped = groupPlaceMatches([
      {
        merchant_name: 'The Local Pub',
        category: 'bar',
        confidence: 'high',
        reason: 'name',
        date: '2026-08-01',
        amount: 20,
        transaction_id: 'a',
      },
      {
        merchant_name: 'The Local Pub',
        category: 'bar',
        confidence: 'high',
        reason: 'name',
        date: '2026-08-08',
        amount: 30,
        transaction_id: 'b',
      },
    ])
    expect(grouped).toHaveLength(1)
    expect(grouped[0].visit_count).toBe(2)
    expect(grouped[0].total_spend).toBe(50)
    expect(grouped[0].last_seen_date).toBe('2026-08-08')
  })
})

describe('buildAfterDrinkBiometrics', () => {
  it('attaches day+1 and day+2 fitness stats and compares to baseline', () => {
    const rows = buildAfterDrinkBiometrics(
      [{ log_date: '2026-08-10', drink_count: 3 }],
      [
        { log_date: '2026-08-08', stress_level: 3, self_energy_level: 8, sleep_hours: 7.5 },
        { log_date: '2026-08-11', stress_level: 7, self_energy_level: 4, sleep_hours: 5 },
        { log_date: '2026-08-12', stress_level: 6, self_energy_level: 5, sleep_hours: 6 },
      ],
      [
        {
          sync_date: '2026-08-11',
          stress_level_1_10: 7,
          contextual_energy_level_1_10: 4,
        },
        {
          sync_date: '2026-08-12',
          stress_level_1_10: 6,
          contextual_energy_level_1_10: 5,
        },
      ]
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].day1.date).toBe('2026-08-11')
    expect(rows[0].day1.stress_level).toBe(7)
    expect(rows[0].day1.contextual_energy).toBe(4)
    expect(rows[0].day2.date).toBe('2026-08-12')
    expect(rows[0].energyDeltaVsBaseline).toBeLessThan(0)
    expect(rows[0].stressDeltaVsBaseline).toBeGreaterThan(0)
    expect(describeCorrelation(rows[0])).toMatch(/energy averaged/i)
  })
})

describe('evaluateEarnedBadgeIds', () => {
  it('awards streak, honesty, and savings badges from progress', () => {
    const ids = evaluateEarnedBadgeIds({
      currentStreak: 7,
      totalSoberDays: 7,
      hasDrinkLog: true,
      decisionLogCount: 3,
      confirmedPlaceCount: 1,
      savedToDate: 120,
    })
    expect(ids).toEqual(
      expect.arrayContaining([
        'first_sober_day',
        'streak_3',
        'streak_7',
        'honesty',
        'reflection',
        'pattern_seeker',
        'savings_100',
      ])
    )
    expect(ids).not.toContain('streak_14')
  })
})
