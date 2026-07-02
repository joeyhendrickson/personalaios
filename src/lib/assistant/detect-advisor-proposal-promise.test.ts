import { describe, expect, it } from 'vitest'
import { advisorPromisedProposalCards } from './detect-advisor-proposal-promise'

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
