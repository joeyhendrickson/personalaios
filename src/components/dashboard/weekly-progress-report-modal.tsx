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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">Progress Report</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          <p className="text-sm text-gray-600">
            Generate a styled progress report with your accomplishments, Life Hacks highlights, and
            an AI-written summary. Cover art is designed with DALL·E 3.
          </p>

          {quota && (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                quota.isPremium
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : quota.canGenerate
                    ? 'border-blue-100 bg-blue-50 text-blue-900'
                    : 'border-orange-200 bg-orange-50 text-orange-900'
              }`}
            >
              {quota.isPremium ? (
                <span className="flex items-center gap-1.5 font-medium">
                  <Crown className="h-4 w-4" />
                  Premium — unlimited reports
                </span>
              ) : (
                <span>
                  Standard plan: {quota.reportsUsedThisWeek} / {quota.weeklyLimit} report used this
                  week
                  {!quota.canGenerate && quota.nextAvailableAt && (
                    <span className="block mt-1 text-xs opacity-90">
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
            <label className="mb-2 block text-sm font-medium text-gray-700">Report period</label>
            <div className="space-y-2">
              {PERIOD_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    periodType === opt.value
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-gray-200 hover:border-gray-300'
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
                    <span className="font-medium text-gray-900">{opt.label}</span>
                    <p className="text-xs text-gray-500">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
              {!quota?.canGenerate && !quota?.isPremium && (
                <Link
                  href="/subscribe?plan=premium"
                  className="mt-2 inline-flex items-center gap-1 font-medium text-red-900 underline"
                >
                  <Crown className="h-3.5 w-3.5" />
                  Upgrade to Premium for unlimited reports
                </Link>
              )}
            </div>
          )}

          {report && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Sparkles className="h-4 w-4 text-blue-500" />
                {report.periodLabel}
              </div>
              {hasCoverImage && (
                <p className="text-xs text-gray-500">Custom DALL·E cover included in PDF</p>
              )}
              <p className="text-sm text-gray-700 line-clamp-4">{report.narrativeSummary}</p>
              {report.highlightsBullets.length > 0 && (
                <ul className="text-xs text-gray-600 list-disc pl-4 space-y-1">
                  {report.highlightsBullets.slice(0, 4).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
              {report.moduleHighlights.length > 0 && (
                <p className="text-xs text-gray-500">
                  {report.moduleHighlights.length} Life Hack module
                  {report.moduleHighlights.length === 1 ? '' : 's'} highlighted
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-200 px-6 py-4 sm:flex-row">
          {!report ? (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || (quota !== null && !quota.canGenerate)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-black py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating report…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate report
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-black py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparing PDF…
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4" />
                  Download PDF
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {report ? 'Done' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}
