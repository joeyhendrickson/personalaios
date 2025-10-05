import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { drive_folder_url, client_name, project_name } = body

    if (!drive_folder_url || !client_name || !project_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate Google Drive folder URL
    const folderIdMatch = drive_folder_url.match(/\/folders\/([a-zA-Z0-9-_]+)/)
    if (!folderIdMatch) {
      return NextResponse.json({ error: 'Invalid Google Drive folder URL' }, { status: 400 })
    }

    const folderId = folderIdMatch[1]

    // Check if user has Google Drive credentials
    const { data: credentials } = await supabase
      .from('project_plan_builder_credentials')
      .select('google_access_token, google_refresh_token')
      .eq('user_id', user.id)
      .single()

    if (!credentials?.google_access_token) {
      return NextResponse.json(
        { error: 'Google Drive not connected. Please configure credentials first.' },
        { status: 400 }
      )
    }

    // Create analysis job
    const jobId = uuidv4()
    const { error: jobError } = await supabase.from('raid_monitoring_jobs').insert({
      id: jobId,
      user_id: user.id,
      status: 'pending',
      progress: 0,
      client_name,
      project_name,
      drive_folder_id: folderId,
      drive_folder_url: drive_folder_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (jobError) {
      console.error('Error creating RAID analysis job:', jobError)
      return NextResponse.json({ error: 'Failed to create analysis job' }, { status: 500 })
    }

    // Start background RAID analysis process
    setTimeout(async () => {
      try {
        // Update job status to running
        await supabase
          .from('raid_monitoring_jobs')
          .update({
            status: 'running',
            progress: 10,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)

        // Simulate RAID analysis steps
        const steps = [
          { progress: 20, message: 'Connecting to Google Drive...' },
          { progress: 40, message: 'Downloading and processing documents...' },
          { progress: 60, message: 'Extracting RAID entries...' },
          { progress: 80, message: 'Calculating scores and detecting fires...' },
          { progress: 95, message: 'Storing results...' },
        ]

        for (const step of steps) {
          await new Promise((resolve) => setTimeout(resolve, 2000)) // 2 second delay per step

          await supabase
            .from('raid_monitoring_jobs')
            .update({
              progress: step.progress,
              updated_at: new Date().toISOString(),
            })
            .eq('id', jobId)
        }

        // Create mock RAID entries
        const mockRAIDEntries = [
          {
            id: `raid:${user.id}:${client_name}:${project_name}:risk:vendor-approval:v1`,
            user_id: user.id,
            job_id: jobId,
            type: 'Risk',
            title: 'Missing vendor approval',
            description: 'Vendor sign-off blocking production deployment',
            impact: 5,
            likelihood: 4,
            urgency: 3,
            confidence: 0.9,
            priority_score: 54,
            severity: 'High',
            blocker: true,
            owner: 'Ana',
            due_date: '2025-10-10',
            status: 'Open',
            is_fire: true,
            fire_reason: 'Blocker + overdue',
            fire_status: 'Unacknowledged',
            sources: JSON.stringify([
              {
                doc_title: 'Sprint 5 Retro',
                doc_date: '2025-10-03',
                excerpt: 'Vendor approval still pending for production deployment',
              },
            ]),
            version: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: `raid:${user.id}:${client_name}:${project_name}:issue:database-performance:v1`,
            user_id: user.id,
            job_id: jobId,
            type: 'Issue',
            title: 'Database performance degradation',
            description: 'Query response times increased by 300% in production',
            impact: 4,
            likelihood: 5,
            urgency: 3,
            confidence: 0.95,
            priority_score: 60,
            severity: 'Critical',
            blocker: true,
            owner: 'Dev Team',
            due_date: '2025-10-08',
            status: 'Open',
            is_fire: true,
            fire_reason: 'High impact + likelihood',
            fire_status: 'Unacknowledged',
            sources: JSON.stringify([
              {
                doc_title: 'Production Incident Report',
                doc_date: '2025-10-05',
                excerpt: 'Database queries taking 3x longer than normal',
              },
            ]),
            version: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: `raid:${user.id}:${client_name}:${project_name}:dependency:api-integration:v1`,
            user_id: user.id,
            job_id: jobId,
            type: 'Dependency',
            title: 'Third-party API integration',
            description: 'External API changes may affect our integration',
            impact: 3,
            likelihood: 3,
            urgency: 2,
            confidence: 0.8,
            priority_score: 18,
            severity: 'Medium',
            blocker: false,
            owner: 'Integration Team',
            due_date: '2025-10-15',
            status: 'Open',
            is_fire: false,
            sources: JSON.stringify([
              {
                doc_title: 'API Documentation Review',
                doc_date: '2025-10-02',
                excerpt: 'Third-party API has breaking changes in v2.0',
              },
            ]),
            version: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]

        // Insert RAID entries
        const { error: entriesError } = await supabase
          .from('raid_monitoring_entries')
          .insert(mockRAIDEntries)

        if (entriesError) {
          console.error('Error inserting RAID entries:', entriesError)
        }

        // Create fire events for high-priority items
        const fireEvents = mockRAIDEntries
          .filter((entry) => entry.is_fire)
          .map((entry) => ({
            id: `fire:${client_name}:${project_name}:${entry.id}:${Date.now()}`,
            user_id: user.id,
            job_id: jobId,
            raid_id: entry.id,
            triggered_at: new Date().toISOString(),
            trigger_rule: entry.fire_reason || 'High priority score',
            priority_score: entry.priority_score,
            severity: entry.severity,
            next_actions: JSON.stringify([
              'Escalate to PMO',
              'Assign mitigation owner',
              'Update client risk log',
            ]),
            status: 'Unacknowledged',
          }))

        if (fireEvents.length > 0) {
          const { error: firesError } = await supabase
            .from('raid_monitoring_fires')
            .insert(fireEvents)

          if (firesError) {
            console.error('Error inserting fire events:', firesError)
          }
        }

        // Complete the job with summary
        const summary = {
          risks_count: mockRAIDEntries.filter((e) => e.type === 'Risk').length,
          assumptions_count: 0,
          issues_count: mockRAIDEntries.filter((e) => e.type === 'Issue').length,
          dependencies_count: mockRAIDEntries.filter((e) => e.type === 'Dependency').length,
          fires_detected: fireEvents.length,
          critical_count: mockRAIDEntries.filter((e) => e.severity === 'Critical').length,
          high_count: mockRAIDEntries.filter((e) => e.severity === 'High').length,
          medium_count: mockRAIDEntries.filter((e) => e.severity === 'Medium').length,
          low_count: mockRAIDEntries.filter((e) => e.severity === 'Low').length,
        }

        await supabase
          .from('raid_monitoring_jobs')
          .update({
            status: 'completed',
            progress: 100,
            summary: summary,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)
      } catch (error) {
        console.error('Error in background RAID analysis:', error)
        await supabase
          .from('raid_monitoring_jobs')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)
      }
    }, 1000)

    return NextResponse.json({
      message: 'RAID analysis started successfully',
      job_id: jobId,
    })
  } catch (error) {
    console.error('Error starting RAID analysis:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
