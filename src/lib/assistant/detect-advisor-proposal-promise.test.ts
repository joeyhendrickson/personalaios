import { describe, expect, it } from 'vitest'
import {
  advisorOfferedDashboardAdd,
  advisorPromisedProposalCards,
} from './detect-advisor-proposal-promise'

describe('advisorPromisedProposalCards', () => {
  it('detects wind-down style proposal promise', () => {
    const text = `I'm preparing the proposal card — it will appear for your review.

Nothing will be saved until you tap Confirm & Add.`
    expect(advisorPromisedProposalCards(text)).toBe(true)
  })

  it('ignores generic advice without proposal language', () => {
    expect(advisorPromisedProposalCards('Try a 10-minute walk before bed tonight.')).toBe(false)
  })
})

describe('advisorOfferedDashboardAdd', () => {
  it('detects a checkmark offer in conversation', () => {
    expect(
      advisorOfferedDashboardAdd(
        'Want this water habit on your dashboard? Tap the checkmark to add it.'
      )
    ).toBe(true)
  })

  it('detects a want-me-to-add offer', () => {
    expect(advisorOfferedDashboardAdd('Want me to add this as a habit?')).toBe(true)
  })

  it('ignores generic dashboard mentions', () => {
    expect(advisorOfferedDashboardAdd('Your dashboard already has a morning workout habit.')).toBe(
      false
    )
  })
})
