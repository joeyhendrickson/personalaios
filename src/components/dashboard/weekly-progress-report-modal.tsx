'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Settings, FileDown, Loader2, Sparkles, Crown } from 'lucide-react'
import type {
  ProgressReportDocument,
  ProgressReportQuota,
  ReportPeriodType,
} from '@/lib/progress-reports/types'

const PERIOD_OPTIONS: { value: ReportPeriodType; label: string; description: string }[] = [
  { value: 'weekly', label: 'Weekly', description: 'Monday through Sunday of this week' },
  {
    value: 'bi_monthly',
    label: 'Bi-monthly (14 days)',
    description: 'Rolling last 14 days',
  },
  { value: 'monthly', label: 'Monthly', description: 'Current calendar month' },
]

export function WeeklyProgressReportModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [quota, setQuota] = useState<ProgressReportQuota | null>(null)
  const [periodType, setPeriodType] = useState<ReportPeriodType>('weekly')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
  const [report, setReport] = useState<ProgressReportDocument | null>(null)
  const [hasCoverImage, setHasCoverImage] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const loadQuota = useCallback(async () => {
    try {
      const res = await fetch('/api/progress-reports/quota', { credentials: 'same-origin' })
      if (res.ok) {
        const data = await res.json()
        setQuota(data.quota)
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (open) {
      setError(null)
      setReportId(null)
      setReport(null)
      void loadQuota()
    }
  }, [open, loadQuota])

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    setReportId(null)
    setReport(null)

    try {
      const res = await fetch('/api/progress-reports/generate', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodType }),
      })

      const data = await res.json()

      if (res.status === 429) {
        setQuota(data.quota)
        setError(data.quota?.message || 'You have reached your weekly report limit.')
        return
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate report')
      }

      setReportId(data.reportId)
      setReport(data.report)
      setHasCoverImage(data.hasCoverImage)
      setQuota(data.quota)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!reportId) return
    setDownloading(true)
    try {
      const res = await fetch(`/api/progress-reports/${reportId}/download`, {
        credentials: 'same-origin',
      })
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `life-stacks-progress-report.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Could not download PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="progress-plan-modal flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl shadow-xl">
        <div className="progress-plan-modal__header flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Settings className="progress-plan-modal__icon h-5 w-5" />
            <h3 className="progress-plan-modal__title text-lg font-semibold">Progress Plan</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="progress-plan-modal__close rounded-md p-1 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          <p className="progress-plan-modal__intro text-sm">
            Generate a styled progress plan with a profile of who you are, what drove your
            motivation, where your attention went, and a SWOT analysis—plus highlights you can share
            or frame for motivation!
          </p>

          {quota && (
            <div
              className={`progress-plan-modal__quota rounded-lg px-3 py-2 text-sm ${
                !quota.isPremium && !quota.canGenerate ? 'progress-plan-modal__quota--warning' : ''
              }`}
            >
              {quota.isPremium ? (
                <span className="progress-plan-modal__quota-premium flex items-center gap-1.5 font-medium">
                  <Crown className="h-4 w-4" />
                  Premium — unlimited reports
                </span>
              ) : (
                <span>
                  Standard plan: {quota.reportsUsedThisWeek} / {quota.weeklyLimit} report used this
                  week
                  {!quota.canGenerate && quota.nextAvailableAt && (
                    <span className="progress-plan-modal__period-desc mt-1 block">
                      Next available:{' '}
                      {new Date(quota.nextAvailableAt).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </span>
              )}
            </div>
          )}

          <div>
            <label className="progress-plan-modal__label mb-2 block text-sm font-medium">
              Report period
            </label>
            <div className="space-y-2">
              {PERIOD_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`progress-plan-modal__period flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors ${
                    periodType === opt.value ? 'progress-plan-modal__period--selected' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="periodType"
                    value={opt.value}
                    checked={periodType === opt.value}
                    onChange={() => setPeriodType(opt.value)}
                    className="mt-1"
                  />
                  <div>
                    <span className="progress-plan-modal__period-title">{opt.label}</span>
                    <p className="progress-plan-modal__period-desc">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="progress-plan-modal__error rounded-lg px-3 py-2 text-sm">
              {error}
              {!quota?.canGenerate && !quota?.isPremium && (
                <Link
                  href="/subscribe?plan=premium"
                  className="progress-plan-modal__quota-premium mt-2 inline-flex items-center gap-1 font-medium underline"
                >
                  <Crown className="h-3.5 w-3.5" />
                  Upgrade to Premium for unlimited reports
                </Link>
              )}
            </div>
          )}

          {report && (
            <div className="progress-plan-modal__preview space-y-3 rounded-lg p-4">
              <div className="progress-plan-modal__preview-title flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="progress-plan-modal__icon h-4 w-4" />
                {report.periodLabel}
              </div>
              {hasCoverImage && (
                <p className="progress-plan-modal__preview-muted text-xs">
                  Custom DALL·E cover included in PDF
                </p>
              )}
              {report.userProfile && (
                <p className="progress-plan-modal__preview-muted line-clamp-2 text-xs">
                  {report.userProfile.whoYouSeemToBe}
                </p>
              )}
              {report.focusReview?.summary && (
                <p className="progress-plan-modal__preview-muted line-clamp-3 text-sm">
                  {report.focusReview.summary}
                </p>
              )}
              {report.swot?.strengths?.length ? (
                <p className="progress-plan-modal__preview-muted text-xs">
                  SWOT included ({report.swot.strengths.length} strengths,{' '}
                  {report.swot.opportunities?.length || 0} opportunities)
                </p>
              ) : null}
              {report.highlightsBullets.length > 0 && (
                <ul className="progress-plan-modal__preview-muted list-disc space-y-1 pl-4 text-xs">
                  {report.highlightsBullets.slice(0, 4).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
              {report.moduleHighlights.length > 0 && (
                <p className="progress-plan-modal__preview-muted text-xs">
                  {report.moduleHighlights.length} Life Hack module
                  {report.moduleHighlights.length === 1 ? '' : 's'} highlighted
                </p>
              )}
            </div>
          )}
        </div>

        <div className="progress-plan-modal__footer flex flex-col gap-2 px-6 py-4 sm:flex-row">
          {!report ? (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || (quota !== null && !quota.canGenerate)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-black py-2.5 text-sm font-medium text-white ring-1 ring-[hsl(43_76%_52%/0.55)] hover:bg-[hsl(43_28%_10%)] disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating report…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-[hsl(43_76%_52%)]" />
                  Generate report
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-black py-2.5 text-sm font-medium text-white ring-1 ring-[hsl(43_76%_52%/0.55)] hover:bg-[hsl(43_28%_10%)] disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparing PDF…
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 text-[hsl(43_76%_52%)]" />
                  Download PDF
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="progress-plan-modal__btn-secondary rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
          >
            {report ? 'Done' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}
