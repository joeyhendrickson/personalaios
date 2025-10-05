import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'
import { SocialMediaDriveParser } from '@/lib/post-creator/drive-parser'
import { VoiceAnalyzer } from '@/lib/post-creator/voice-analysis'
import { decrypt } from '@/lib/crypto'

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
    const { drive_folder_url } = body

    if (!drive_folder_url) {
      return NextResponse.json({ error: 'Missing Google Drive folder URL' }, { status: 400 })
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
    const { error: jobError } = await supabase.from('post_creator_jobs').insert({
      id: jobId,
      user_id: user.id,
      status: 'pending',
      progress: 0,
      drive_folder_id: folderId,
      drive_folder_url: drive_folder_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (jobError) {
      console.error('Error creating voice analysis job:', jobError)
      return NextResponse.json({ error: 'Failed to create analysis job' }, { status: 500 })
    }

    // Start background voice analysis process
    setTimeout(async () => {
      try {
        // Update job status to running
        await supabase
          .from('post_creator_jobs')
          .update({
            status: 'running',
            progress: 10,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)

        // Get user credentials
        const { data: credentials } = await supabase
          .from('project_plan_builder_credentials')
          .select('google_access_token, openai_api_key')
          .eq('user_id', user.id)
          .single()

        if (!credentials?.google_access_token) {
          throw new Error('Google Drive access token not found')
        }

        // Decrypt the access token
        const accessToken = decrypt(credentials.google_access_token)
        if (!accessToken) {
          throw new Error('Failed to decrypt Google access token')
        }

        // Step 1: Connect to Google Drive and parse files
        await supabase
          .from('post_creator_jobs')
          .update({
            progress: 20,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)

        const driveParser = new SocialMediaDriveParser(accessToken)
        const exports = await driveParser.parseSocialMediaExports(folderId)

        if (exports.length === 0) {
          throw new Error('No social media posts found in the specified folder')
        }

        // Step 2: Extract all posts
        await supabase
          .from('post_creator_jobs')
          .update({
            progress: 40,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)

        const allPosts = exports.flatMap((exp: any) => exp.posts)
        console.log(`Found ${allPosts.length} posts across ${exports.length} platforms`)

        if (allPosts.length < 5) {
          throw new Error('Insufficient posts for voice analysis. Need at least 5 posts.')
        }

        // Step 3: Analyze voice
        await supabase
          .from('post_creator_jobs')
          .update({
            progress: 60,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)

        const openaiKey = credentials.openai_api_key
          ? decrypt(credentials.openai_api_key)
          : process.env.OPENAI_API_KEY
        if (!openaiKey) {
          throw new Error('OpenAI API key not found')
        }

        const voiceAnalyzer = new VoiceAnalyzer(openaiKey)
        const analysisResult = await voiceAnalyzer.analyzeVoice(allPosts)

        // Step 4: Store results
        await supabase
          .from('post_creator_jobs')
          .update({
            progress: 95,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)

        // Complete the job with voice profile
        await supabase
          .from('post_creator_jobs')
          .update({
            status: 'completed',
            progress: 100,
            voice_profile: analysisResult.voice_profile,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)

        // Store the voice profile in the voice profiles table
        const { error: profileError } = await supabase.from('post_creator_voice_profiles').upsert(
          {
            user_id: user.id,
            job_id: jobId,
            voice_profile: analysisResult.voice_profile,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          }
        )

        if (profileError) {
          console.error('Error storing voice profile:', profileError)
        }

        console.log('Voice analysis completed successfully')
      } catch (error) {
        console.error('Error in background voice analysis:', error)
        await supabase
          .from('post_creator_jobs')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)
      }
    }, 1000)

    return NextResponse.json({
      message: 'Voice analysis started successfully',
      job_id: jobId,
    })
  } catch (error) {
    console.error('Error starting voice analysis:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
