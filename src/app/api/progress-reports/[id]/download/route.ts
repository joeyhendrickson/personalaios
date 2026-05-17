import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildProgressReportPdf } from '@/lib/progress-reports/build-pdf'
import type { ProgressReportDocument } from '@/lib/progress-reports/types'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: row, error } = await supabase
      .from('progress_reports')
      .select('id, title, report_data, cover_image_base64, period_start, period_end')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !row) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const report = row.report_data as ProgressReportDocument
    const pdfBytes = await buildProgressReportPdf(report, row.cover_image_base64)

    const filename = `life-stacks-progress-${row.period_start}-${row.period_end}.pdf`

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-cache',
      },
    })
  } catch (error) {
    console.error('[progress-reports/download]', error)
    return NextResponse.json({ error: 'Failed to build PDF' }, { status: 500 })
  }
}
