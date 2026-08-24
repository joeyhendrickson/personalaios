import { describe, expect, it } from 'vitest'
import { buildPersonSummary, parsePersonSummary, withPersonSummary } from './person-summary'

describe('person-summary', () => {
  it('builds who you are, vision, and goals from assessment data', () => {
    const summary = buildPersonSummary({
      life_plan_summary: 'A builder who wants mornings back.\n\nThey are shaping a calmer career.',
      vision_statement: 'Live with unhurried mornings and honest work.',
      goals_generated: [{ goal: 'Ship the book' }, { goal: 'Run three days a week' }],
      personal_insights: ['Protects family dinner'],
    })
    expect(summary.who_you_are).toContain('builder')
    expect(summary.vision).toContain('unhurried')
    expect(summary.goals).toEqual(['Ship the book', 'Run three days a week'])
    expect(summary.narrative).toContain('builder')
  })

  it('keeps a stored person_summary', () => {
    const stored = {
      who_you_are: 'A dad who writes at dawn.',
      vision: 'Write the novel.',
      goals: ['Draft chapter 1'],
      narrative: 'A dad who writes at dawn.',
    }
    expect(parsePersonSummary({ person_summary: stored })).toEqual(stored)
  })

  it('attaches person_summary when completing a session', () => {
    const next = withPersonSummary({
      vision_statement: 'Be well.',
      goals_generated: [{ goal: 'Walk daily' }],
    })
    expect(next.person_summary).toMatchObject({
      vision: 'Be well.',
      goals: ['Walk daily'],
    })
  })
})
