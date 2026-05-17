import type { ReportPeriodType } from './types'

export function getReportPeriodRange(
  periodType: ReportPeriodType,
  referenceDate: Date = new Date()
): { start: Date; end: Date; label: string } {
  const end = new Date(referenceDate)
  end.setHours(23, 59, 59, 999)

  const start = new Date(referenceDate)
  start.setHours(0, 0, 0, 0)

  if (periodType === 'weekly') {
    const day = start.getDay()
    const diffToMonday = day === 0 ? 6 : day - 1
    start.setDate(start.getDate() - diffToMonday)
    const endWeek = new Date(start)
    endWeek.setDate(start.getDate() + 6)
    endWeek.setHours(23, 59, 59, 999)
    return {
      start,
      end: endWeek,
      label: `Week of ${formatShortDate(start)} – ${formatShortDate(endWeek)}`,
    }
  }

  if (periodType === 'bi_monthly') {
    start.setDate(start.getDate() - 13)
    return {
      start,
      end,
      label: `Last 14 days (${formatShortDate(start)} – ${formatShortDate(end)})`,
    }
  }

  // monthly — calendar month containing reference date
  start.setDate(1)
  const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999)
  const monthName = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  return {
    start,
    end: monthEnd,
    label: monthName,
  }
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function startOfCalendarWeek(d: Date): Date {
  const start = new Date(d)
  start.setHours(0, 0, 0, 0)
  const day = start.getDay()
  const diffToMonday = day === 0 ? 6 : day - 1
  start.setDate(start.getDate() - diffToMonday)
  return start
}

export function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}
