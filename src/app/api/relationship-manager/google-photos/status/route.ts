import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has Google Photos integration stored
    const { data: integration, error } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('integration_type', 'google_photos')
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      // If table doesn't exist or other error, assume not connected
      console.log('Google Photos integration not available:', error.message)
      return NextResponse.json({
        connected: false,
        error: 'Integration not configured',
      })
    }

    const connected = integration && integration.is_active && integration.access_token

    return NextResponse.json({
      connected: !!connected,
      integration: connected
        ? {
            connected_at: integration.created_at,
            last_sync: integration.last_sync_at,
          }
        : null,
    })
  } catch (error) {
    console.error('Error in Google Photos status API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
