import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendBugReportEmail } from '@/lib/email'
import { z } from 'zod'

const bugReportSchema = z.object({
  type: z.enum(['bug', 'feature']),
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().min(1, 'Description is required'),
  screenshot_url: z.string().url().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
})

// GET /api/bug-reports - Get user's bug reports
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: bugReports, error } = await supabase
      .from('bug_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching bug reports:', error)
      return NextResponse.json({ error: 'Failed to fetch bug reports' }, { status: 500 })
    }

    return NextResponse.json({ bugReports })
  } catch (error) {
    console.error('Error in bug reports GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/bug-reports - Create a new bug report
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
    const validatedData = bugReportSchema.parse(body)

    const { data: bugReport, error } = await supabase
      .from('bug_reports')
      .insert({
        user_id: user.id,
        type: validatedData.type,
        title: validatedData.title,
        description: validatedData.description,
        screenshot_url: validatedData.screenshot_url,
        priority: validatedData.priority || 'medium',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating bug report:', error)
      return NextResponse.json({ error: 'Failed to create bug report' }, { status: 500 })
    }

    // Send email notification
    const emailResult = await sendBugReportEmail({
      type: validatedData.type,
      title: validatedData.title,
      description: validatedData.description,
      userEmail: user.email || 'unknown@example.com',
      screenshotUrl: validatedData.screenshot_url,
      priority: validatedData.priority || 'medium',
      reportId: bugReport.id,
    })

    if (!emailResult.success) {
      console.warn('Failed to send email notification:', emailResult.error)
      // Don't fail the request if email fails, just log it
    }

    return NextResponse.json(
      {
        bugReport,
        emailSent: emailResult.success,
        emailError: emailResult.error,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    console.error('Error in bug reports POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
