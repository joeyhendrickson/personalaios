import type { ReportPeriodType } from './types'
import type { Language } from '@/contexts/language-context'

export function getReportPeriodRange(
  periodType: ReportPeriodType,
  referenceDate: Date = new Date(),
  language: Language = 'en'
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
      label:
        language === 'es'
          ? `Semana del ${formatShortDate(start, language)} – ${formatShortDate(endWeek, language)}`
          : `Week of ${formatShortDate(start, language)} – ${formatShortDate(endWeek, language)}`,
    }
  }

  if (periodType === 'bi_monthly') {
    start.setDate(start.getDate() - 13)
    return {
      start,
      end,
      label:
        language === 'es'
          ? `Últimos 14 días (${formatShortDate(start, language)} – ${formatShortDate(end, language)})`
          : `Last 14 days (${formatShortDate(start, language)} – ${formatShortDate(end, language)})`,
    }
  }

  // monthly — calendar month containing reference date
  start.setDate(1)
  const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999)
  const locale = language === 'es' ? 'es-ES' : 'en-US'
  const monthName = start.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  return {
    start,
    end: monthEnd,
    label: monthName,
  }
}

function formatShortDate(d: Date, language: Language = 'en'): string {
  const locale = language === 'es' ? 'es-ES' : 'en-US'
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
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
