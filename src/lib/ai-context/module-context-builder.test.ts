import { describe, expect, it } from 'vitest'
import { buildModuleSummaryForModule } from './module-context-builder'

describe('buildModuleSummaryForModule fitness-tracker', () => {
  it('includes Google Health sleep rows for advisor context', () => {
    const summary = buildModuleSummaryForModule('fitness-tracker', {
      fitness_biometrics: [
        {
          sync_date: '2026-06-19',
          recorded_at: '2026-06-19T12:00:00Z',
          source: 'google_health',
          sleep_hours: 6.25,
          resting_heart_rate: 58,
          steps: 4200,
        },
        {
          sync_date: '2026-06-18',
          recorded_at: '2026-06-18T12:00:00Z',
          source: 'google_health',
          sleep_hours: 7.5,
          resting_heart_rate: 56,
          steps: 8100,
        },
      ],
    })

    expect(summary.hasData).toBe(true)
    expect(summary.objectiveFacts.some((fact) => fact.includes('6.25h sleep'))).toBe(true)
    expect(summary.recentHighlights[0]).toContain('Most recent sleep: 6.3h')
  })
})

describe('buildModuleSummaryForModule sobriety-tracker', () => {
  it('summarizes sober vs drinking days and influence places', () => {
    const summary = buildModuleSummaryForModule('sobriety-tracker', {
      sobriety_daily_logs: [
        { log_date: '2026-08-13', drank: false, drink_count: 0 },
        { log_date: '2026-08-10', drank: true, drink_count: 3, notes: 'after work' },
      ],
      sobriety_influence_places: [
        { merchant_name: "Joe's Pub", highlighted: true, user_confirmed: true },
      ],
      sobriety_decision_logs: [
        {
          drink_date: '2026-08-10',
          day_offset: 1,
          has_rumination: true,
          content: 'Kept replaying the night',
        },
      ],
    })

    expect(summary.hasData).toBe(true)
    expect(summary.objectiveFacts.some((fact) => fact.includes('1 sober day'))).toBe(true)
    expect(summary.objectiveFacts.some((fact) => fact.includes('Drank 3 on 2026-08-10'))).toBe(true)
    expect(summary.recentHighlights.some((h) => h.includes("Joe's Pub"))).toBe(true)
    expect(summary.subjectiveNotes.some((n) => n.includes('rumination'))).toBe(true)
  })
})
