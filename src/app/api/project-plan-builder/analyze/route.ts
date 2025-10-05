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
      return NextResponse.json({ error: 'Google Drive not connected' }, { status: 400 })
    }

    // Create analysis job
    const jobId = uuidv4()
    const { error: jobError } = await supabase.from('project_plan_builder_jobs').insert({
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
      console.error('Error creating analysis job:', jobError)
      return NextResponse.json({ error: 'Failed to create analysis job' }, { status: 500 })
    }

    // Start background analysis process
    // Note: In a production environment, this would trigger a background job/queue
    // For now, we'll simulate the process
    setTimeout(async () => {
      try {
        // Update job status to running
        await supabase
          .from('project_plan_builder_jobs')
          .update({
            status: 'running',
            progress: 10,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)

        // Simulate analysis steps
        const steps = [
          { progress: 20, message: 'Connecting to Google Drive...' },
          { progress: 40, message: 'Downloading and processing files...' },
          { progress: 60, message: 'Extracting knowledge cards...' },
          { progress: 80, message: 'Indexing to Pinecone...' },
          { progress: 95, message: 'Generating sufficiency report...' },
        ]

        for (const step of steps) {
          await new Promise((resolve) => setTimeout(resolve, 2000)) // 2 second delay per step

          await supabase
            .from('project_plan_builder_jobs')
            .update({
              progress: step.progress,
              updated_at: new Date().toISOString(),
            })
            .eq('id', jobId)
        }

        // Complete the job with mock sufficiency report
        const mockSufficiencyReport = {
          coverage_percentages: {
            requirements: 85,
            constraints: 70,
            decisions: 60,
            risks: 45,
            terms: 90,
            personas: 75,
          },
          missing_items: [
            'Budget ceiling not specified',
            'Timeline constraints unclear',
            'Stakeholder approval process undefined',
          ],
          conflicts: ['Timeline in kickoff meeting conflicts with budget document'],
          warnings: [
            {
              type: 'critical',
              message: 'No defined budget ceiling found in documents',
              category: 'budget',
            },
            {
              type: 'recommended',
              message: 'Consider adding risk mitigation strategies',
              category: 'risk',
            },
          ],
        }

        await supabase
          .from('project_plan_builder_jobs')
          .update({
            status: 'completed',
            progress: 100,
            sufficiency_report: mockSufficiencyReport,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)
      } catch (error) {
        console.error('Error in background analysis:', error)
        await supabase
          .from('project_plan_builder_jobs')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)
      }
    }, 1000)

    return NextResponse.json({
      message: 'Analysis started successfully',
      job_id: jobId,
    })
  } catch (error) {
    console.error('Error starting analysis:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
