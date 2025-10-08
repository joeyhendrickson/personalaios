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

    const { searchParams } = new URL(request.url)
    const relationshipId = searchParams.get('relationshipId')

    if (!relationshipId) {
      return NextResponse.json({ error: 'Relationship ID is required' }, { status: 400 })
    }

    // Verify the relationship belongs to the user
    const { data: relationship, error: relationshipError } = await supabase
      .from('relationships')
      .select('id')
      .eq('id', relationshipId)
      .eq('user_id', user.id)
      .single()

    if (relationshipError || !relationship) {
      return NextResponse.json({ error: 'Relationship not found' }, { status: 404 })
    }

    // Fetch photos for this relationship
    const { data: photos, error: photosError } = await supabase
      .from('relationship_photos')
      .select('*')
      .eq('relationship_id', relationshipId)
      .eq('user_id', user.id)
      .order('photo_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (photosError) {
      console.error('Error fetching photos:', photosError)
      return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 })
    }

    return NextResponse.json({ photos: photos || [] })
  } catch (error) {
    console.error('Error in photos GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
