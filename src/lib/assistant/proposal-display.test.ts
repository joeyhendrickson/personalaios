import { describe, expect, it } from 'vitest'
import { buildProposalDisplayModel } from './proposal-display'

describe('buildProposalDisplayModel', () => {
  it('labels habit proposals for the Habits section', () => {
    const model = buildProposalDisplayModel('create_habit', {
      title: 'Short Wind-down',
      description: 'Dim lights, stretch, journal, DND on.',
      points_per_completion: 25,
    })
    expect(model.sectionTitle).toBe('Habits')
    expect(model.headline).toBe('Short Wind-down')
    expect(model.confirmLabel).toBe('Add to Habits')
    expect(model.details.some((d) => d.label === 'Description')).toBe(true)
  })

  it('labels task completion for the Tasks section', () => {
    const model = buildProposalDisplayModel('complete_task', {
      title: 'Email investor update',
    })
    expect(model.sectionTitle).toBe('Tasks')
    expect(model.isCompletion).toBe(true)
    expect(model.confirmLabel).toBe('Mark task complete')
  })
})
