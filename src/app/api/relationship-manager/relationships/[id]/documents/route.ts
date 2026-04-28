import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { RELATIONSHIP_MANAGER_BUCKET, buildStoragePath } from '@/lib/relationship-manager/storage'

const kindSchema = z.enum(['project_plan', 'agreement', 'email_export', 'other'])
const MAX_BYTES = 25 * 1024 * 1024

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

  const { data: docs, error } = await supabase
    .from('relationship_documents')
    .select('*')
    .eq('relationship_id', relationshipId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to list documents' }, { status: 500 })
  }

  const withUrls = await Promise.all(
    (docs ?? []).map(async (d) => {
      const { data: signed } = await supabase.storage
        .from(RELATIONSHIP_MANAGER_BUCKET)
        .createSignedUrl(d.storage_path, 3600)
      return { ...d, signed_url: signed?.signedUrl ?? null }
    })
  )

  return NextResponse.json({ documents: withUrls })
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
      .select('id')
      .eq('id', relationshipId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!rel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const form = await request.formData()
    const file = form.get('file')
    const kindRaw = form.get('kind')
    const kindParsed = kindSchema.safeParse(typeof kindRaw === 'string' ? kindRaw : 'other')
    const kind = kindParsed.success ? kindParsed.data : 'other'

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    if (buf.length > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }

    const path = buildStoragePath(user.id, relationshipId, 'documents', file.name)
    const { error: upErr } = await supabase.storage
      .from(RELATIONSHIP_MANAGER_BUCKET)
      .upload(path, buf, { contentType: file.type || 'application/octet-stream', upsert: false })

    if (upErr) {
      console.error('doc upload', upErr)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    let extracted_summary: string | null = null
    if (file.type.startsWith('text/') || file.type === 'message/rfc822') {
      extracted_summary = buf.toString('utf8').slice(0, 12000)
    }

    const { data: row, error: insErr } = await supabase
      .from('relationship_documents')
      .insert({
        user_id: user.id,
        relationship_id: relationshipId,
        kind,
        file_name: file.name,
        mime_type: file.type || null,
        storage_path: path,
        extracted_summary,
      })
      .select()
      .single()

    if (insErr) {
      console.error('documents insert', insErr)
      await supabase.storage.from(RELATIONSHIP_MANAGER_BUCKET).remove([path])
      return NextResponse.json({ error: 'Failed to save document' }, { status: 500 })
    }

    return NextResponse.json({ document: row })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
