import { describe, expect, it } from 'vitest'
import {
  formatEventTime,
  groupEventsByLocalDay,
  localWeekRange,
  parseGoogleCalendarEvent,
} from './google-events'

describe('parseGoogleCalendarEvent', () => {
  it('maps timed events to ISO start/end', () => {
    const event = parseGoogleCalendarEvent({
      id: 'abc',
      summary: 'Standup',
      start: { dateTime: '2026-08-24T13:00:00-04:00' },
      end: { dateTime: '2026-08-24T13:30:00-04:00' },
      htmlLink: 'https://calendar.google.com/event?eid=abc',
      status: 'confirmed',
    })
    expect(event).toMatchObject({
      id: 'abc',
      title: 'Standup',
      allDay: false,
      htmlLink: 'https://calendar.google.com/event?eid=abc',
    })
    expect(event?.start).toBe('2026-08-24T17:00:00.000Z')
    expect(event?.end).toBe('2026-08-24T17:30:00.000Z')
  })

  it('maps all-day events and treats Google end.date as exclusive', () => {
    const event = parseGoogleCalendarEvent({
      id: 'vac',
      summary: 'Vacation',
      start: { date: '2026-08-24' },
      end: { date: '2026-08-26' },
    })
    expect(event?.allDay).toBe(true)
    expect(event?.title).toBe('Vacation')
    expect(new Date(event!.end).getTime()).toBeGreaterThan(new Date(event!.start).getTime())
  })

  it('skips cancelled events and events without an id', () => {
    expect(
      parseGoogleCalendarEvent({
        id: 'gone',
        status: 'cancelled',
        start: { dateTime: '2026-08-24T13:00:00Z' },
        end: { dateTime: '2026-08-24T14:00:00Z' },
      })
    ).toBeNull()
    expect(
      parseGoogleCalendarEvent({
        summary: 'No id',
        start: { dateTime: '2026-08-24T13:00:00Z' },
        end: { dateTime: '2026-08-24T14:00:00Z' },
      })
    ).toBeNull()
  })
})

describe('localWeekRange', () => {
  it('returns a Sunday-start exclusive week covering the anchor', () => {
    const { start, end } = localWeekRange(new Date('2026-08-27T15:00:00'))
    expect(start.getDay()).toBe(0)
    expect(end.getTime() - start.getTime()).toBe(7 * 24 * 60 * 60 * 1000)
    expect(start.getTime()).toBeLessThanOrEqual(new Date('2026-08-27T15:00:00').getTime())
    expect(end.getTime()).toBeGreaterThan(new Date('2026-08-27T15:00:00').getTime())
  })
})

describe('groupEventsByLocalDay', () => {
  it('buckets events into the seven local days and sorts all-day first', () => {
    const weekStart = new Date('2026-08-23T00:00:00')
    const days = groupEventsByLocalDay(
      [
        {
          id: '2',
          title: 'Call',
          description: null,
          location: null,
          htmlLink: null,
          allDay: false,
          start: new Date('2026-08-24T15:00:00').toISOString(),
          end: new Date('2026-08-24T16:00:00').toISOString(),
          status: 'confirmed',
        },
        {
          id: '1',
          title: 'Holiday',
          description: null,
          location: null,
          htmlLink: null,
          allDay: true,
          start: new Date('2026-08-24T00:00:00').toISOString(),
          end: new Date('2026-08-25T00:00:00').toISOString(),
          status: 'confirmed',
        },
      ],
      weekStart,
      new Date('2026-08-24T12:00:00')
    )
    expect(days).toHaveLength(7)
    const monday = days.find((d) => d.dateKey === '2026-08-24')
    expect(monday?.events.map((e) => e.title)).toEqual(['Holiday', 'Call'])
    expect(monday?.isToday).toBe(true)
  })
})

describe('formatEventTime', () => {
  it('labels all-day events', () => {
    expect(
      formatEventTime({
        id: '1',
        title: 'Off',
        description: null,
        location: null,
        htmlLink: null,
        allDay: true,
        start: '2026-08-24T00:00:00.000Z',
        end: '2026-08-25T00:00:00.000Z',
        status: null,
      })
    ).toBe('All day')
  })
})
