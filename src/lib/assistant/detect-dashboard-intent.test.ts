import { describe, expect, it } from 'vitest'
import { detectDashboardIntent } from './detect-dashboard-intent'

describe('detectDashboardIntent', () => {
  it('proposes a plan when user asks to add a habit to the dashboard', () => {
    expect(
      detectDashboardIntent('Please add a daily water tracking habit to my habits section', {
        hasDashboardPlan: false,
        hasGoalProposals: false,
      })
    ).toEqual({ type: 'propose_plan' })
  })

  it('does not propose when a plan is already showing and user confirms', () => {
    expect(
      detectDashboardIntent('yes add it', {
        hasDashboardPlan: true,
        hasGoalProposals: false,
      })
    ).toEqual({ type: 'commit_all' })
  })
})
