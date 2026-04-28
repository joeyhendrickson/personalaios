import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  RELATIONSHIP_MANAGER_BUCKET,
  buildMboxImportStoragePath,
} from '@/lib/relationship-manager/storage'
import { getOrCreateRelationshipContact } from '@/lib/relationship-manager/mbox/get-or-create-contact'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const form = await request.formData()
    const relationshipId = form.get('relationshipId')
    const contactEmailRaw = form.get('contactEmail')
    const file = form.get('file')

    if (typeof relationshipId !== 'string' || !relationshipId) {
      return NextResponse.json({ error: 'relationshipId is required' }, { status: 400 })
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }

    const lower = file.name.toLowerCase()
    if (!lower.endsWith('.mbox')) {
      return NextResponse.json({ error: 'Only .mbox files are supported' }, { status: 400 })
    }

    const { data: rel, error: relErr } = await supabase
      .from('relationships')
      .select('id')
      .eq('id', relationshipId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (relErr || !rel) {
      return NextResponse.json({ error: 'Relationship not found' }, { status: 404 })
    }

    const contactEmail =
      typeof contactEmailRaw === 'string' && contactEmailRaw.trim() ? contactEmailRaw.trim() : null

    const contact = await getOrCreateRelationshipContact(supabase, user.id, relationshipId, {
      primaryEmailOverride: contactEmail,
    })

    const { data: job, error: jobErr } = await supabase
      .from('relationship_import_jobs')
      .insert({
        user_id: user.id,
        contact_id: contact.id,
        source_type: 'email_mbox',
        original_file_name: file.name,
        file_path: null,
        status: 'pending',
        metadata: {
          relationshipId,
          userAccountEmails: user.email ? [user.email.toLowerCase()] : [],
          contactEmailOverride: contactEmail,
        },
      })
      .select('id')
      .single()

    if (jobErr || !job?.id) {
      return NextResponse.json(
        { error: jobErr?.message || 'Failed to create import job' },
        { status: 500 }
      )
    }

    const jobId = job.id as string
    const storagePath = buildMboxImportStoragePath(user.id, relationshipId, jobId, file.name)

    const buf = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await supabase.storage
      .from(RELATIONSHIP_MANAGER_BUCKET)
      .upload(storagePath, buf, {
        contentType: 'application/mbox',
        upsert: false,
      })

    if (upErr) {
      await supabase.from('relationship_import_jobs').delete().eq('id', jobId)
      return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })
    }

    await supabase
      .from('relationship_import_jobs')
      .update({ file_path: storagePath })
      .eq('id', jobId)

    console.log('[mbox-import]', { phase: 'uploaded', jobId, bytes: buf.length })

    return NextResponse.json({
      importJobId: jobId,
      contactId: contact.id,
    })
  } catch (e) {
    console.log('[mbox-import]', { phase: 'upload_error' })
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
