import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RELATIONSHIP_MANAGER_BUCKET, buildStoragePath } from '@/lib/relationship-manager/storage'
import { describeRelationshipPhoto } from '@/lib/relationship-manager/vision'

const ALLOWED_IMAGE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_BYTES = 15 * 1024 * 1024

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: relationshipId } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: rel, error: relErr } = await supabase
      .from('relationships')
      .select('id, name')
      .eq('id', relationshipId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (relErr || !rel) {
      return NextResponse.json({ error: 'Relationship not found' }, { status: 404 })
    }

    const form = await request.formData()
    const file = form.get('file')
    const userCaption =
      typeof form.get('caption') === 'string' ? (form.get('caption') as string) : ''

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    if (!ALLOWED_IMAGE.has(file.type)) {
      return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    if (buf.length > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }

    const path = buildStoragePath(user.id, relationshipId, 'photos', file.name)
    const { error: upErr } = await supabase.storage
      .from(RELATIONSHIP_MANAGER_BUCKET)
      .upload(path, buf, { contentType: file.type, upsert: false })

    if (upErr) {
      console.error('storage upload', upErr)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    let description: string | null = null
    let ai_tags: string[] = []
    try {
      const vision = await describeRelationshipPhoto(buf, file.type, rel.name)
      description = vision.description
      ai_tags = vision.tags
    } catch (e) {
      console.error('vision describe skipped', e)
    }

    const { data: photoRow, error: insErr } = await supabase
      .from('relationship_photos')
      .insert({
        user_id: user.id,
        relationship_id: relationshipId,
        source: 'manual',
        storage_path: path,
        photo_url: null,
        google_photo_id: null,
        thumbnail_url: null,
        description,
        ai_tags: ai_tags.length ? ai_tags : null,
        user_caption: userCaption || null,
        relevance_score: 0.7,
      })
      .select()
      .single()

    if (insErr) {
      console.error('relationship_photos insert', insErr)
      await supabase.storage.from(RELATIONSHIP_MANAGER_BUCKET).remove([path])
      return NextResponse.json({ error: 'Failed to save photo record' }, { status: 500 })
    }

    const { data: signed } = await supabase.storage
      .from(RELATIONSHIP_MANAGER_BUCKET)
      .createSignedUrl(path, 3600)

    return NextResponse.json({
      photo: { ...photoRow, signed_url: signed?.signedUrl ?? null },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
