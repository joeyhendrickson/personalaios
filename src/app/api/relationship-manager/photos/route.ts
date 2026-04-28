import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RELATIONSHIP_MANAGER_BUCKET } from '@/lib/relationship-manager/storage'

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

    const { searchParams } = new URL(request.url)
    const relationshipId = searchParams.get('relationshipId')

    if (!relationshipId) {
      return NextResponse.json({ error: 'Relationship ID is required' }, { status: 400 })
    }

    const { data: relationship, error: relationshipError } = await supabase
      .from('relationships')
      .select('id')
      .eq('id', relationshipId)
      .eq('user_id', user.id)
      .single()

    if (relationshipError || !relationship) {
      return NextResponse.json({ error: 'Relationship not found' }, { status: 404 })
    }

    const { data: photos, error: photosError } = await supabase
      .from('relationship_photos')
      .select('*')
      .eq('relationship_id', relationshipId)
      .eq('user_id', user.id)
      .order('photo_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (photosError) {
      console.error('Error fetching photos:', photosError)
      return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 })
    }

    const enriched = await Promise.all(
      (photos || []).map(async (p) => {
        if (p.source === 'manual' && p.storage_path) {
          const { data } = await supabase.storage
            .from(RELATIONSHIP_MANAGER_BUCKET)
            .createSignedUrl(p.storage_path, 3600)
          return {
            ...p,
            signed_url: data?.signedUrl ?? null,
            display_url: data?.signedUrl ?? p.thumbnail_url ?? p.photo_url,
          }
        }
        return {
          ...p,
          signed_url: null,
          display_url: p.thumbnail_url || p.photo_url,
        }
      })
    )

    return NextResponse.json({ photos: enriched })
  } catch (error) {
    console.error('Error in photos GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
