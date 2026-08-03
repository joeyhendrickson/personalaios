'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { X, Settings, FileDown, Loader2, Sparkles, Crown } from 'lucide-react'
import type {
  ProgressReportDocument,
  ProgressReportQuota,
  ReportPeriodType,
} from '@/lib/progress-reports/types'
import { useLanguage } from '@/contexts/language-context'

export function WeeklyProgressReportModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { t, language } = useLanguage()
  const [quota, setQuota] = useState<ProgressReportQuota | null>(null)
  const [periodType, setPeriodType] = useState<ReportPeriodType>('weekly')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
  const [report, setReport] = useState<ProgressReportDocument | null>(null)
  const [hasCoverImage, setHasCoverImage] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const periodOptions = useMemo(
    () => [
      {
        value: 'weekly' as const,
        label: t('report.period.weekly'),
        description: t('report.period.weeklyDesc'),
      },
      {
        value: 'bi_monthly' as const,
        label: t('report.period.biMonthly'),
        description: t('report.period.biMonthlyDesc'),
      },
      {
        value: 'monthly' as const,
        label: t('report.period.monthly'),
        description: t('report.period.monthlyDesc'),
      },
    ],
    [t]
  )

  const loadQuota = useCallback(async () => {
    try {
      const res = await fetch('/api/progress-reports/quota', {
        credentials: 'same-origin',
        headers: { 'X-Language': language },
      })
      if (res.ok) {
        const data = await res.json()
        setQuota(data.quota)
      }
    } catch {
      /* ignore */
    }
  }, [language])

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
        headers: {
          'Content-Type': 'application/json',
          'X-Language': language,
        },
        body: JSON.stringify({ periodType, language }),
      })

      const data = await res.json()

      if (res.status === 429) {
        setQuota(data.quota)
        setError(data.quota?.message || t('report.limitReached'))
        return
      }

      if (!res.ok) {
        throw new Error(data.error || t('report.generateFailed'))
      }

      setReportId(data.reportId)
      setReport(data.report)
      setHasCoverImage(data.hasCoverImage)
      setQuota(data.quota)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('report.generateFailed'))
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
        headers: { 'X-Language': language },
      })
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download =
        language === 'es' ? 'informe-progreso-lifestacks.pdf' : 'life-stacks-progress-report.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError(t('report.downloadFailed'))
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
            <h3 className="progress-plan-modal__title text-lg font-semibold">
              {t('report.title')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="progress-plan-modal__close rounded-md p-1 transition-colors"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          <p className="progress-plan-modal__intro text-sm">{t('report.intro')}</p>

          {quota && (
            <div
              className={`progress-plan-modal__quota rounded-lg px-3 py-2 text-sm ${
                !quota.isPremium && !quota.canGenerate ? 'progress-plan-modal__quota--warning' : ''
              }`}
            >
              {quota.isPremium ? (
                <span className="progress-plan-modal__quota-premium flex items-center gap-1.5 font-medium">
                  <Crown className="h-4 w-4" />
                  {t('report.premiumUnlimited')}
                </span>
              ) : (
                <span>
                  {t('report.standardQuota', {
                    used: quota.reportsUsedThisWeek,
                    limit: quota.weeklyLimit,
                  })}
                  {!quota.canGenerate && quota.nextAvailableAt && (
                    <span className="progress-plan-modal__period-desc mt-1 block">
                      {t('report.nextAvailable')}{' '}
                      {new Date(quota.nextAvailableAt).toLocaleDateString(
                        language === 'es' ? 'es-ES' : 'en-US',
                        {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        }
                      )}
                    </span>
                  )}
                </span>
              )}
            </div>
          )}

          <div>
            <label className="progress-plan-modal__label mb-2 block text-sm font-medium">
              {t('report.periodLabel')}
            </label>
            <div className="space-y-2">
              {periodOptions.map((opt) => (
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
              {error.includes('Standard accounts') || error.includes('cuentas estándar')
                ? t('report.quotaLimitMessage')
                : error}
              {!quota?.canGenerate && !quota?.isPremium && (
                <Link
                  href="/subscribe?plan=premium"
                  className="progress-plan-modal__quota-premium mt-2 inline-flex items-center gap-1 font-medium underline"
                >
                  <Crown className="h-3.5 w-3.5" />
                  {t('report.upgradePremium')}
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
                  {t('report.coverIncluded')}
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
                  {t('report.swotIncluded', {
                    strengths: report.swot.strengths.length,
                    opportunities: report.swot.opportunities?.length || 0,
                  })}
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
                  {report.moduleHighlights.length === 1
                    ? t('report.modulesHighlighted', { count: report.moduleHighlights.length })
                    : t('report.modulesHighlightedPlural', {
                        count: report.moduleHighlights.length,
                      })}
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
                  {t('report.generating')}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-[hsl(43_76%_52%)]" />
                  {t('report.generate')}
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
                  {t('report.preparingPdf')}
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 text-[hsl(43_76%_52%)]" />
                  {t('report.downloadPdf')}
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="progress-plan-modal__btn-secondary rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
          >
            {report ? t('report.done') : t('report.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
