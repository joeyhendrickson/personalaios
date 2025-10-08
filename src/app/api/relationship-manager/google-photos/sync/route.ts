import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's Google Photos integration
    const { data: integration, error: integrationError } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('integration_type', 'google_photos')
      .eq('is_active', true)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json({ error: 'Google Photos not connected' }, { status: 400 })
    }

    // Check if token needs refresh
    const now = new Date()
    const tokenExpiry = new Date(integration.token_expires_at)
    
    let accessToken = integration.access_token

    if (now >= tokenExpiry) {
      // Refresh the token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_PHOTOS_CLIENT_ID!,
          client_secret: process.env.GOOGLE_PHOTOS_CLIENT_SECRET!,
          refresh_token: integration.refresh_token!,
          grant_type: 'refresh_token',
        }),
      })

      if (!refreshResponse.ok) {
        return NextResponse.json({ error: 'Failed to refresh Google Photos token' }, { status: 401 })
      }

      const refreshData = await refreshResponse.json()
      accessToken = refreshData.access_token

      // Update the integration with new token
      await supabase
        .from('user_integrations')
        .update({
          access_token: refreshData.access_token,
          token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
          last_sync_at: new Date().toISOString()
        })
        .eq('id', integration.id)
    }

    // Fetch photos from Google Photos API
    const photosResponse = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!photosResponse.ok) {
      console.error('Google Photos API error:', await photosResponse.text())
      return NextResponse.json({ error: 'Failed to fetch photos from Google Photos' }, { status: 500 })
    }

    const photosData = await photosResponse.json()
    const photos = photosData.mediaItems || []

    let syncedCount = 0
    let skippedCount = 0

    // Process each photo
    for (const photo of photos.slice(0, 50)) { // Limit to first 50 photos for initial sync
      try {
        // Check if photo already exists
        const { data: existingPhoto } = await supabase
          .from('relationship_photos')
          .select('id')
          .eq('google_photo_id', photo.id)
          .eq('user_id', user.id)
          .single()

        if (existingPhoto) {
          skippedCount++
          continue
        }

        // Extract photo metadata
        const photoUrl = photo.baseUrl
        const thumbnailUrl = photo.baseUrl + '=w200-h200'
        const photoDate = photo.mediaMetadata?.creationTime ? new Date(photo.mediaMetadata.creationTime).toISOString().split('T')[0] : null
        const description = photo.description || ''

        // Insert photo record
        const { error: insertError } = await supabase
          .from('relationship_photos')
          .insert({
            user_id: user.id,
            relationship_id: null, // Will be matched later
            google_photo_id: photo.id,
            photo_url: photoUrl,
            thumbnail_url: thumbnailUrl,
            photo_date: photoDate,
            description: description,
            people_in_photo: [], // Will be populated by AI analysis
            ai_tags: [], // Will be populated by AI analysis
            relevance_score: 0.5 // Default score
          })

        if (insertError) {
          console.error('Error inserting photo:', insertError)
          continue
        }

        syncedCount++

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (photoError) {
        console.error(`Error processing photo ${photo.id}:`, photoError)
        continue
      }
    }

    // Update last sync time
    await supabase
      .from('user_integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', integration.id)

    return NextResponse.json({
      message: `Successfully synced ${syncedCount} new photos`,
      synced: syncedCount,
      skipped: skippedCount,
      total: photos.length
    })

  } catch (error) {
    console.error('Error syncing Google Photos:', error)
    return NextResponse.json({ error: 'Failed to sync photos' }, { status: 500 })
  }
}
