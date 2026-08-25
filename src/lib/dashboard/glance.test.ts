import { describe, expect, it } from 'vitest'
import {
  attachMonthChange,
  composeAiInsight,
  computeAccountTotals,
  computeHealthGlance,
  firstNameFromDisplay,
  formatSleepHours,
  greetingForHour,
  isCashAccount,
  isInvestmentAccount,
  selectTodayPlan,
  selectTopFocus,
  selectUpcoming,
} from './glance'

describe('homepage glance helpers', () => {
  it('picks greeting from hour of day', () => {
    expect(greetingForHour(8)).toBe('morning')
    expect(greetingForHour(14)).toBe('afternoon')
    expect(greetingForHour(20)).toBe('evening')
  })

  it('derives a first name from profile or email', () => {
    expect(firstNameFromDisplay('Alex Rivera', 'alex@example.com')).toBe('Alex')
    expect(firstNameFromDisplay(null, 'jordan.lee@example.com')).toBe('Jordan')
    expect(firstNameFromDisplay('', '')).toBe('there')
  })

  it('formats sleep as hours and minutes', () => {
    expect(formatSleepHours(7.7)).toBe('7h 42m')
    expect(formatSleepHours(8)).toBe('8h')
  })

  it('classifies cash vs investment accounts', () => {
    expect(isCashAccount({ type: 'depository', subtype: 'checking' })).toBe(true)
    expect(isInvestmentAccount({ type: 'investment', subtype: 'brokerage' })).toBe(true)
  })

  it('builds today plan from open tasks and counts remaining', () => {
    const plan = selectTodayPlan(
      [
        { id: '1', title: 'Morning Workout', status: 'pending', priority: 'high' },
        { id: '2', title: 'Team Call', status: 'pending', priority: 'medium' },
        {
          id: '3',
          title: 'Done already',
          status: 'completed',
          completed_at: new Date().toISOString(),
        },
      ],
      [],
      new Date(),
      4
    )
    expect(plan.items.map((item) => item.title)).toEqual(['Morning Workout', 'Team Call'])
    expect(plan.remaining).toBe(2)
    expect(plan.completedToday).toBe(1)
  })

  it('uses dated goals and projects for upcoming', () => {
    const upcoming = selectUpcoming(
      [{ id: 'g1', title: "Mom's Birthday", status: 'active', target_date: '2099-05-30' }],
      [{ id: 'p1', title: 'Product Launch Prep', is_completed: false, deadline: '2099-05-27' }],
      new Date('2026-05-01T12:00:00Z')
    )
    expect(upcoming.map((item) => item.title)).toEqual(['Product Launch Prep', "Mom's Birthday"])
  })

  it('picks the highest-priority goal as top focus', () => {
    const focus = selectTopFocus(
      [
        {
          id: 'g1',
          title: 'Launch new digital product',
          status: 'active',
          current_value: 65,
          target_value: 100,
          priority_level: 5,
        },
      ],
      [],
      [{ id: 't1', title: 'Finish landing page', status: 'pending', weekly_goal_id: 'g1' }]
    )
    expect(focus).toMatchObject({
      title: 'Launch new digital product',
      percent: 65,
      nextStep: 'Finish landing page',
    })
  })

  it('summarizes health from the latest biometric row', () => {
    const health = computeHealthGlance([
      { sleep_hours: 7.7, resting_heart_rate: 62, steps: 8243, contextual_energy_level_1_10: 8 },
    ])
    expect(health.heartLabel).toBe('RHR')
    expect(health.heartValue).toBe(62)
    expect(health.sleepLabel).toBe('7h 42m')
    expect(health.steps).toBe(8243)
    expect(health.readiness).toBe(80)
  })

  it('computes cash, investments, and net worth', () => {
    const finance = computeAccountTotals(
      [
        { id: 'c', type: 'depository', subtype: 'checking', current_balance: 12840 },
        { id: 'i', type: 'investment', subtype: 'brokerage', current_balance: 86230 },
      ],
      []
    )
    expect(finance).toMatchObject({
      cash: 12840,
      investments: 86230,
      netWorth: 99070,
    })
  })

  it('attaches month-over-month net worth change', () => {
    const finance = attachMonthChange(
      { netWorth: 128450, monthChangePct: null, investments: 1, cash: 1 },
      [
        { date: '2026-04-24', netWorth: 125440 },
        { date: '2026-05-24', netWorth: 128450 },
      ],
      '2026-05-24'
    )
    expect(finance.monthChangePct).toBe(2.4)
  })

  it('composes an insight from real signals instead of placeholder copy', () => {
    const text = composeAiInsight({
      health: {
        heartLabel: 'RHR',
        heartValue: 62,
        sleepLabel: '7h 42m',
        steps: 8243,
        readiness: 76,
        sparkline: [1, 2, 3],
      },
      remainingTasks: 3,
      focusTitle: 'Launch new digital product',
      hasFinance: true,
    })
    expect(text).toContain('sleeping well')
    expect(text).toContain('focus time')
    expect(text).not.toContain('Costa Rica')
  })
})
