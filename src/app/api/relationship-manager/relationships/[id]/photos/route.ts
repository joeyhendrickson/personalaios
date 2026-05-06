import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RELATIONSHIP_MANAGER_BUCKET, buildStoragePath } from '@/lib/relationship-manager/storage'
import { describeRelationshipPhoto } from '@/lib/relationship-manager/vision'
import { unzipSync } from 'fflate'

const ALLOWED_IMAGE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const ZIP_MIME = new Set(['application/zip', 'application/x-zip-compressed'])
const MAX_BYTES = 15 * 1024 * 1024
const MAX_ZIP_ENTRIES = 50
const MAX_ZIP_TOTAL_UNZIPPED_BYTES = 60 * 1024 * 1024

function detectImageMimeType(fileName: string, buf: Buffer): string | null {
  const lower = fileName.toLowerCase()
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  )
    return 'image/png'
  if (buf.length >= 6 && buf.subarray(0, 6).toString('ascii') === 'GIF87a') return 'image/gif'
  if (buf.length >= 6 && buf.subarray(0, 6).toString('ascii') === 'GIF89a') return 'image/gif'
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  )
    return 'image/webp'

  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  return null
}

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

    const buf = Buffer.from(await file.arrayBuffer())
    if (buf.length > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }

    const isZip = ZIP_MIME.has(file.type) || file.name.toLowerCase().endsWith('.zip')
    const uploadOne = async (photoBuf: Buffer, mimeType: string, originalName: string) => {
      const path = buildStoragePath(user.id, relationshipId, 'photos', originalName)
      const { error: upErr } = await supabase.storage
        .from(RELATIONSHIP_MANAGER_BUCKET)
        .upload(path, photoBuf, { contentType: mimeType, upsert: false })

      if (upErr) {
        throw new Error('Upload failed')
      }

      let description: string | null = null
      let ai_tags: string[] = []
      try {
        const vision = await describeRelationshipPhoto(photoBuf, mimeType, rel.name, {
          userId: user.id,
          route: `/api/relationship-manager/relationships/${relationshipId}/photos`,
        })
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
        await supabase.storage.from(RELATIONSHIP_MANAGER_BUCKET).remove([path])
        throw new Error('Failed to save photo record')
      }

      const { data: signed } = await supabase.storage
        .from(RELATIONSHIP_MANAGER_BUCKET)
        .createSignedUrl(path, 3600)

      return { ...photoRow, signed_url: signed?.signedUrl ?? null }
    }

    if (!isZip) {
      if (!ALLOWED_IMAGE.has(file.type)) {
        return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 })
      }
      const photo = await uploadOne(buf, file.type, file.name)
      return NextResponse.json({ photo })
    }

    // Zip upload: extract image files and ingest each as a photo
    let extracted: Record<string, Uint8Array>
    try {
      extracted = unzipSync(new Uint8Array(buf))
    } catch (e) {
      console.error('zip unzip failed', e)
      return NextResponse.json({ error: 'Invalid zip file' }, { status: 400 })
    }

    const entries = Object.entries(extracted)
      .filter(
        ([name]) => !name.endsWith('/') && !name.includes('__MACOSX') && !name.startsWith('.')
      )
      .slice(0, MAX_ZIP_ENTRIES + 1)

    if (entries.length === 0) {
      return NextResponse.json({ error: 'Zip contained no files' }, { status: 400 })
    }
    if (entries.length > MAX_ZIP_ENTRIES) {
      return NextResponse.json(
        { error: `Zip contains too many files (max ${MAX_ZIP_ENTRIES})` },
        { status: 400 }
      )
    }

    let totalBytes = 0
    const imageFiles = entries
      .map(([name, u8]) => {
        const b = Buffer.from(u8)
        totalBytes += b.length
        const mime = detectImageMimeType(name, b)
        return { name, buf: b, mime }
      })
      .filter((f) => f.mime && ALLOWED_IMAGE.has(f.mime))

    if (totalBytes > MAX_ZIP_TOTAL_UNZIPPED_BYTES) {
      return NextResponse.json({ error: 'Zip extracted content too large' }, { status: 400 })
    }
    if (imageFiles.length === 0) {
      return NextResponse.json({ error: 'Zip contained no supported images' }, { status: 400 })
    }

    const created: unknown[] = []
    const errors: { file: string; error: string }[] = []
    for (const img of imageFiles) {
      try {
        // Preserve original file name segment but avoid nested paths
        const baseName = img.name.split('/').pop() || img.name
        const photo = await uploadOne(img.buf, img.mime!, baseName)
        created.push(photo)
      } catch (e) {
        console.error('zip photo ingest failed', img.name, e)
        errors.push({ file: img.name, error: 'Failed to ingest' })
      }
    }

    return NextResponse.json({
      photos: created,
      errors: errors.length ? errors : null,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
