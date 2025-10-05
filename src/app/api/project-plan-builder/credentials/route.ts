import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { encrypt } from '@/lib/crypto'

export async function GET() {
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

    // Check if user has any stored credentials
    const { data: credentials, error } = await supabase
      .from('project_plan_builder_credentials')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Error fetching credentials:', error)
      return NextResponse.json({ error: 'Failed to fetch credentials' }, { status: 500 })
    }

    // Determine connection status
    const connectionStatus = {
      google_connected: !!credentials?.google_access_token,
      pinecone_configured: !!credentials?.pinecone_api_key,
      openai_configured: !!credentials?.openai_api_key,
    }

    return NextResponse.json({
      credentials: connectionStatus,
      message: 'Credentials fetched successfully',
    })
  } catch (error) {
    console.error('Error in credentials GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    const { pinecone_key, pinecone_project, openai_key } = body

    if (!pinecone_key || !pinecone_project) {
      return NextResponse.json({ error: 'Pinecone key and project are required' }, { status: 400 })
    }

    // Encrypt sensitive data
    const encryptedPineconeKey = encrypt(pinecone_key)
    const encryptedOpenaiKey = openai_key ? encrypt(openai_key) : null

    // Check if credentials already exist
    const { data: existingCredentials } = await supabase
      .from('project_plan_builder_credentials')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (existingCredentials) {
      // Update existing credentials
      const { error: updateError } = await supabase
        .from('project_plan_builder_credentials')
        .update({
          pinecone_api_key: encryptedPineconeKey,
          pinecone_project_id: pinecone_project,
          openai_api_key: encryptedOpenaiKey,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Error updating credentials:', updateError)
        return NextResponse.json({ error: 'Failed to update credentials' }, { status: 500 })
      }
    } else {
      // Insert new credentials
      const { error: insertError } = await supabase
        .from('project_plan_builder_credentials')
        .insert({
          user_id: user.id,
          pinecone_api_key: encryptedPineconeKey,
          pinecone_project_id: pinecone_project,
          openai_api_key: encryptedOpenaiKey,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error('Error inserting credentials:', insertError)
        return NextResponse.json({ error: 'Failed to save credentials' }, { status: 500 })
      }
    }

    return NextResponse.json({
      message: 'Credentials saved successfully',
      credentials: {
        google_connected: false,
        pinecone_configured: true,
        openai_configured: !!openai_key,
      },
    })
  } catch (error) {
    console.error('Error in credentials POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
