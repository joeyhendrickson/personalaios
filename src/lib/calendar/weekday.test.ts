import { describe, expect, it } from 'vitest'
import { nextOccurrence, normalizeWeekday, toWallClockDateTime } from './weekday'

describe('normalizeWeekday', () => {
  it('accepts aliases', () => {
    expect(normalizeWeekday('Monday')).toBe('mon')
    expect(normalizeWeekday('TUE')).toBe('tue')
    expect(normalizeWeekday('thursday')).toBe('thu')
    expect(normalizeWeekday('sat')).toBe('sat')
  })

  it('falls back for unknown values', () => {
    expect(normalizeWeekday('sometime', 'fri')).toBe('fri')
  })
})

describe('nextOccurrence', () => {
  it('returns the next matching weekday at the given time', () => {
    const now = new Date(2026, 7, 23, 8, 0, 0) // Sunday
    const next = nextOccurrence('Monday', '09:30', now)
    expect(next.getDay()).toBe(1)
    expect(next.getHours()).toBe(9)
    expect(next.getMinutes()).toBe(30)
    expect(toWallClockDateTime(next)).toBe('2026-08-24T09:30:00')
  })
})
