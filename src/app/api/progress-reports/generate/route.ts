import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { collectReportContext } from '@/lib/progress-reports/collect-data'
import { generateReportContent } from '@/lib/progress-reports/generate-content'
import { generateCoverImageBase64 } from '@/lib/progress-reports/generate-cover'
import { getReportPeriodRange, toISODate } from '@/lib/progress-reports/period'
import { getProgressReportQuota } from '@/lib/progress-reports/quota'
import type { ProgressReportDocument, ReportPeriodType } from '@/lib/progress-reports/types'

const bodySchema = z.object({
  periodType: z.enum(['weekly', 'bi_monthly', 'monthly']),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { periodType } = bodySchema.parse(body) as { periodType: ReportPeriodType }

    const quota = await getProgressReportQuota(user.id, user.email, {
      userMetadata: user.user_metadata,
    })
    if (!quota.canGenerate) {
      return NextResponse.json(
        {
          error: 'Report limit reached',
          quota,
          upgradeUrl: '/subscribe?plan=premium',
        },
        { status: 429 }
      )
    }

    const { start, end, label } = getReportPeriodRange(periodType)
    const context = await collectReportContext(user.id, start, end)
    const aiContent = await generateReportContent(
      user.id,
      periodType,
      label,
      toISODate(start),
      toISODate(end),
      context
    )

    const coverImageBase64 = await generateCoverImageBase64(
      user.id,
      aiContent.coverArtPrompt,
      label
    )

    const reportDoc: ProgressReportDocument = {
      periodType,
      periodLabel: label,
      periodStart: toISODate(start),
      periodEnd: toISODate(end),
      generatedAt: new Date().toISOString(),
      stats: context.stats,
      moduleHighlights: aiContent.moduleHighlights,
      accomplishments: context.accomplishments,
      userProfile: aiContent.userProfile,
      focusReview: aiContent.focusReview,
      swot: aiContent.swot,
      narrativeSummary: aiContent.narrativeSummary,
      highlightsBullets: aiContent.highlightsBullets,
      coverArtPrompt: aiContent.coverArtPrompt,
    }

    const title = `Progress Report — ${label}`

    const { data: row, error: insertError } = await supabase
      .from('progress_reports')
      .insert({
        user_id: user.id,
        period_type: periodType,
        period_start: toISODate(start),
        period_end: toISODate(end),
        title,
        report_data: reportDoc,
        cover_image_base64: coverImageBase64,
      })
      .select('id, created_at')
      .single()

    if (insertError) {
      console.error('[progress-reports/generate] insert failed:', insertError)
      return NextResponse.json({ error: 'Failed to save report' }, { status: 500 })
    }

    return NextResponse.json({
      reportId: row.id,
      report: reportDoc,
      createdAt: row.created_at,
      hasCoverImage: Boolean(coverImageBase64),
      quota: await getProgressReportQuota(user.id, user.email, {
        userMetadata: user.user_metadata,
      }),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid period type' }, { status: 400 })
    }
    console.error('[progress-reports/generate]', error)
    return NextResponse.json(
      {
        error: 'Failed to generate report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
