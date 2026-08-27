'use client'

import { ChevronLeft, ChevronRight, ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import {
  formatEventTime,
  groupEventsByLocalDay,
  localWeekRange,
  type GoogleCalendarEvent,
} from '@/lib/calendar/google-events'

export function GoogleCalendarAgenda({
  weekAnchor,
  events,
  loading,
  error,
  onPrevWeek,
  onNextWeek,
  onThisWeek,
  onRefresh,
}: {
  weekAnchor: Date
  events: GoogleCalendarEvent[]
  loading: boolean
  error: string
  onPrevWeek: () => void
  onNextWeek: () => void
  onThisWeek: () => void
  onRefresh: () => void
}) {
  const { start, end } = localWeekRange(weekAnchor)
  const days = groupEventsByLocalDay(events, start)
  const heading = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
  const rangeLabel = `${heading.format(start)} – ${heading.format(new Date(end.getTime() - 1))}`
  const eventCount = events.length

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Your Google Calendar</h2>
          <p className="text-sm text-gray-600">
            Events from your primary Google Calendar for {rangeLabel}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onPrevWeek}
            className="rounded-md border border-gray-200 p-2 text-gray-700 hover:bg-gray-50"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onThisWeek}
            className="rounded-md border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            This week
          </button>
          <button
            type="button"
            onClick={onNextWeek}
            className="rounded-md border border-gray-200 p-2 text-gray-700 hover:bg-gray-50"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded-md border border-gray-200 p-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            aria-label="Refresh events"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {loading && events.length === 0 ? (
        <p className="text-sm text-gray-500 inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading Google Calendar events…
        </p>
      ) : eventCount === 0 && !error ? (
        <p className="text-sm text-gray-500">No events on your Google Calendar this week.</p>
      ) : (
        <div className="space-y-4">
          {days.map((day) => (
            <div key={day.dateKey}>
              <h3
                className={`text-sm font-semibold mb-2 ${
                  day.isToday ? 'text-blue-700' : 'text-gray-900'
                }`}
              >
                {day.label}
                {day.isToday ? ' · Today' : ''}
              </h3>
              {day.events.length === 0 ? (
                <p className="text-xs text-gray-400 pl-1">No events</p>
              ) : (
                <ul className="space-y-2">
                  {day.events.map((event) => (
                    <li
                      key={event.id}
                      className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {event.title}
                          </p>
                          <p className="text-xs text-gray-600">{formatEventTime(event)}</p>
                          {event.location && (
                            <p className="text-xs text-gray-500 truncate">{event.location}</p>
                          )}
                        </div>
                        {event.htmlLink && (
                          <a
                            href={event.htmlLink}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 text-xs text-blue-700 hover:underline inline-flex items-center gap-1"
                          >
                            Open
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
