import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Check admin access
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, role')
      .eq('email', user.email)
      .single()

    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Fetch bug reports with user email
    const { data: bugReports, error: bugError } = await supabase
      .from('bug_reports')
      .select(`
        id,
        user_id,
        type,
        title,
        description,
        screenshot_url,
        priority,
        status,
        admin_notes,
        completed_at,
        created_at,
        updated_at,
        auth:user_id (
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (bugError) {
      console.error('Error fetching bug reports:', bugError)
      return NextResponse.json({ error: 'Failed to fetch bug reports' }, { status: 500 })
    }

    // Transform the data to include user email directly
    const transformedReports = bugReports?.map((report) => ({
      ...report,
      user_email: report.auth?.email || `User ${report.user_id.substring(0, 8)}`,
      auth: undefined // Remove the nested auth object
    })) || []

    return NextResponse.json({
      success: true,
      bugReports: transformedReports,
      counts: {
        total: transformedReports.length,
        open: transformedReports.filter(r => r.status === 'open').length,
        in_progress: transformedReports.filter(r => r.status === 'in_progress').length,
        completed: transformedReports.filter(r => r.status === 'completed').length,
        critical: transformedReports.filter(r => r.priority === 'critical').length,
        high: transformedReports.filter(r => r.priority === 'high').length,
      }
    })
  } catch (error) {
    console.error('Unexpected error in bug reports API:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
