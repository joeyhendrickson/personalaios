import { describe, expect, it } from 'vitest'
import { formatStructuredState } from './assemble-context'
import type { StructuredStateSummary } from '@/types/context-cache'

describe('formatStructuredState', () => {
  it('returns empty string for missing state', () => {
    expect(formatStructuredState(null)).toBe('')
  })

  it('does not throw when cached arrays are missing', () => {
    const malformed = {
      weeklyPoints: 10,
      dailyPoints: 2,
      totalGoals: 1,
      totalTasks: 1,
      totalHabits: 0,
      activePriorities: 0,
      completedTasksToday: 0,
      habitCompletionsToday: 0,
    } as unknown as StructuredStateSummary

    const text = formatStructuredState(malformed)
    expect(text).toContain('DASHBOARD STATE')
    expect(text).toContain('Modules: None')
    expect(text).toContain('Top open tasks: None')
  })
})
