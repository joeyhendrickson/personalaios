import { describe, expect, it } from 'vitest'
import { activeDashboardContextFromRows } from './dashboard-context'

describe('activeDashboardContextFromRows', () => {
  it('includes only active projects and goals', () => {
    const items = activeDashboardContextFromRows(
      [
        { id: 'p1', title: 'Launch app', is_completed: false },
        { id: 'p2', title: 'Old launch', is_completed: true },
      ],
      [
        { id: 'g1', title: 'Run 5K', status: 'active' },
        { id: 'g2', title: 'Retired goal', status: 'completed' },
      ]
    )

    expect(items.map((item) => item.title)).toEqual(['Launch app', 'Run 5K'])
    expect(items.map((item) => item.kind)).toEqual(['project', 'goal'])
  })
})
