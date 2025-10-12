import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: photos, error } = await supabase
      .from('body_photos')
      .select('*')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false })

    if (error) {
      console.error('Error fetching body photos:', error)
      return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 })
    }

    return NextResponse.json(photos || [])
  } catch (error) {
    console.error('Error in body photos GET:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch body photos',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Photo ID is required' }, { status: 400 })
    }

    // Get photo record first to get the file path
    const { data: photo, error: fetchError } = await supabase
      .from('body_photos')
      .select('photo_url')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      console.error('Error fetching photo for deletion:', fetchError)
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    // Delete from storage
    const fileName = photo.photo_url.split('/').pop()
    if (fileName) {
      const { error: storageError } = await supabase.storage
        .from('body-photos')
        .remove([`${user.id}/${fileName}`])

      if (storageError) {
        console.error('Error deleting photo from storage:', storageError)
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('body_photos')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (dbError) {
      console.error('Error deleting photo from database:', dbError)
      return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'body_photo_deleted',
      description: 'Deleted body photo',
      metadata: {
        photo_id: id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in body photos DELETE:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete body photo',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
