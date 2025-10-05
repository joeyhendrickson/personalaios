import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all RAID entries for the user
    const { data: entries, error } = await supabase
      .from('raid_monitoring_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('priority_score', { ascending: false })

    if (error) {
      console.error('Error fetching RAID entries for export:', error)
      return NextResponse.json({ error: 'Failed to fetch RAID entries' }, { status: 500 })
    }

    // Convert to CSV format
    const csvHeaders = [
      'ID',
      'Type',
      'Title',
      'Description',
      'Impact',
      'Likelihood',
      'Urgency',
      'Confidence',
      'Priority Score',
      'Severity',
      'Blocker',
      'Owner',
      'Due Date',
      'Status',
      'Is Fire',
      'Fire Reason',
      'Fire Status',
      'Sources',
      'Version',
      'Created At',
      'Updated At',
    ]

    const csvRows = (entries || []).map((entry) => {
      const sources =
        typeof entry.sources === 'string' ? JSON.parse(entry.sources) : entry.sources || []

      const sourcesText = sources.map((s: any) => `${s.doc_title} (${s.doc_date})`).join('; ')

      return [
        entry.id,
        entry.type,
        `"${entry.title.replace(/"/g, '""')}"`,
        `"${entry.description.replace(/"/g, '""')}"`,
        entry.impact,
        entry.likelihood,
        entry.urgency,
        entry.confidence,
        entry.priority_score,
        entry.severity,
        entry.blocker ? 'Yes' : 'No',
        entry.owner || '',
        entry.due_date || '',
        entry.status,
        entry.is_fire ? 'Yes' : 'No',
        entry.fire_reason || '',
        entry.fire_status || '',
        `"${sourcesText.replace(/"/g, '""')}"`,
        entry.version,
        entry.created_at,
        entry.updated_at,
      ]
    })

    const csvContent = [csvHeaders.join(','), ...csvRows.map((row) => row.join(','))].join('\n')

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="raid-log-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting RAID log:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
