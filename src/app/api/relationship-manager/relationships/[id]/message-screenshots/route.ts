import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RELATIONSHIP_MANAGER_BUCKET, buildStoragePath } from '@/lib/relationship-manager/storage'
import { summarizeMessagePdf, summarizeMessageScreenshot } from '@/lib/relationship-manager/vision'

const ALLOWED_IMAGE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const PDF_MIME = 'application/pdf'
const MAX_BYTES = 15 * 1024 * 1024

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: relationshipId } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: rel } = await supabase
    .from('relationships')
    .select('id')
    .eq('id', relationshipId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!rel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: rows, error } = await supabase
    .from('relationship_message_screenshots')
    .select('*')
    .eq('relationship_id', relationshipId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to list screenshots' }, { status: 500 })
  }

  const withUrls = await Promise.all(
    (rows ?? []).map(async (r) => {
      const { data: signed } = await supabase.storage
        .from(RELATIONSHIP_MANAGER_BUCKET)
        .createSignedUrl(r.storage_path, 3600)
      return { ...r, signed_url: signed?.signedUrl ?? null }
    })
  )

  return NextResponse.json({ screenshots: withUrls })
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

    const { data: rel } = await supabase
      .from('relationships')
      .select('id, name')
      .eq('id', relationshipId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!rel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const form = await request.formData()
    const file = form.get('file')
    const caption_notes =
      typeof form.get('caption_notes') === 'string' ? (form.get('caption_notes') as string) : ''

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }
    const isPdf = file.type === PDF_MIME || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf && !ALLOWED_IMAGE.has(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    if (buf.length > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }

    const path = buildStoragePath(user.id, relationshipId, 'message-screenshots', file.name)
    const { error: upErr } = await supabase.storage
      .from(RELATIONSHIP_MANAGER_BUCKET)
      .upload(path, buf, { contentType: isPdf ? PDF_MIME : file.type, upsert: false })

    if (upErr) {
      console.error('screenshot upload', upErr)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    let ai_thread_summary: string | null = null
    try {
      ai_thread_summary = isPdf
        ? await summarizeMessagePdf(buf, rel.name, {
            userId: user.id,
            route: `/api/relationship-manager/relationships/${relationshipId}/message-screenshots`,
          })
        : await summarizeMessageScreenshot(buf, file.type, rel.name, {
            userId: user.id,
            route: `/api/relationship-manager/relationships/${relationshipId}/message-screenshots`,
          })
    } catch (e) {
      console.error('screenshot vision', e)
    }

    const { data: row, error: insErr } = await supabase
      .from('relationship_message_screenshots')
      .insert({
        user_id: user.id,
        relationship_id: relationshipId,
        storage_path: path,
        file_name: file.name,
        mime_type: isPdf ? PDF_MIME : file.type,
        caption_notes: caption_notes || null,
        ai_thread_summary,
      })
      .select()
      .single()

    if (insErr) {
      console.error('screenshots insert', insErr)
      await supabase.storage.from(RELATIONSHIP_MANAGER_BUCKET).remove([path])
      return NextResponse.json({ error: 'Failed to save record' }, { status: 500 })
    }

    const { data: signed } = await supabase.storage
      .from(RELATIONSHIP_MANAGER_BUCKET)
      .createSignedUrl(path, 3600)

    return NextResponse.json({
      screenshot: { ...row, signed_url: signed?.signedUrl ?? null },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
