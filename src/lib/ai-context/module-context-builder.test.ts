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
