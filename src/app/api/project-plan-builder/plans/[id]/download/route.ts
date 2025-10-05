import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const planId = params.id

    // Get the plan
    const { data: plan, error: planError } = await supabase
      .from('project_plan_builder_plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', user.id)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    if (plan.status !== 'completed' || !plan.content) {
      return NextResponse.json({ error: 'Plan not ready for download' }, { status: 400 })
    }

    // Get query parameters for format
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'pdf'

    if (format === 'pdf') {
      // For PDF generation, you would typically use a library like puppeteer or jsPDF
      // For now, we'll return the content as a downloadable text file
      const filename = `${plan.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`

      return new NextResponse(plan.content, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } else if (format === 'docx') {
      // For DOCX generation, you would use a library like docx
      // For now, we'll return as text
      const filename = `${plan.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`

      return new NextResponse(plan.content, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } else {
      return NextResponse.json({ error: 'Unsupported format' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error downloading plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
