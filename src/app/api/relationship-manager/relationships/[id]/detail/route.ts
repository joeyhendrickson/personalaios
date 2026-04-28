import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RELATIONSHIP_MANAGER_BUCKET } from '@/lib/relationship-manager/storage'

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: rel, error: relErr } = await supabase
    .from('relationships')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (relErr || !rel) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const [notes, history, scores, drafts, memories, photos, documents, screenshots] =
    await Promise.all([
      supabase
        .from('relationship_notes')
        .select('id, body, is_pinned, created_at')
        .eq('relationship_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('contact_history')
        .select('id, contact_type, sentiment, outcome, created_at')
        .eq('relationship_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('relationship_score_snapshots')
        .select('*')
        .eq('relationship_id', id)
        .order('computed_at', { ascending: false })
        .limit(10),
      supabase
        .from('outreach_drafts')
        .select('id, channel, subject, body, status, created_at')
        .eq('relationship_id', id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('shared_memories')
        .select('id, title, body, memory_at, place_name, created_at')
        .eq('relationship_id', id)
        .order('memory_at', { ascending: false, nullsFirst: false })
        .limit(20),
      supabase
        .from('relationship_photos')
        .select(
          'id, source, description, ai_tags, photo_date, storage_path, user_caption, created_at'
        )
        .eq('relationship_id', id)
        .order('created_at', { ascending: false })
        .limit(24),
      supabase
        .from('relationship_documents')
        .select('id, kind, file_name, mime_type, extracted_summary, storage_path, created_at')
        .eq('relationship_id', id)
        .order('created_at', { ascending: false })
        .limit(24),
      supabase
        .from('relationship_message_screenshots')
        .select('id, caption_notes, ai_thread_summary, storage_path, created_at')
        .eq('relationship_id', id)
        .order('created_at', { ascending: false })
        .limit(16),
    ])

  const tableErrors = [
    notes.error,
    history.error,
    scores.error,
    drafts.error,
    memories.error,
    photos.error,
    documents.error,
    screenshots.error,
  ].filter(Boolean)
  if (tableErrors.length) {
    return NextResponse.json(
      {
        relationship: rel,
        partial: true,
        errors: tableErrors.map((e) => e?.message),
      },
      { status: 200 }
    )
  }

  const photosRows = photos.data ?? []
  const enrichedPhotos = await Promise.all(
    photosRows.map(async (p: Record<string, unknown>) => {
      if (p.source === 'manual' && typeof p.storage_path === 'string') {
        const { data } = await supabase.storage
          .from(RELATIONSHIP_MANAGER_BUCKET)
          .createSignedUrl(p.storage_path, 3600)
        return { ...p, signed_url: data?.signedUrl ?? null }
      }
      return { ...p, signed_url: null as string | null }
    })
  )

  const docRows = documents.data ?? []
  const enrichedDocs = await Promise.all(
    docRows.map(async (d: Record<string, unknown>) => {
      if (typeof d.storage_path === 'string') {
        const { data } = await supabase.storage
          .from(RELATIONSHIP_MANAGER_BUCKET)
          .createSignedUrl(d.storage_path, 3600)
        return { ...d, signed_url: data?.signedUrl ?? null }
      }
      return { ...d, signed_url: null as string | null }
    })
  )

  const shotRows = screenshots.data ?? []
  const enrichedShots = await Promise.all(
    shotRows.map(async (s: Record<string, unknown>) => {
      if (typeof s.storage_path === 'string') {
        const { data } = await supabase.storage
          .from(RELATIONSHIP_MANAGER_BUCKET)
          .createSignedUrl(s.storage_path, 3600)
        return { ...s, signed_url: data?.signedUrl ?? null }
      }
      return { ...s, signed_url: null as string | null }
    })
  )

  return NextResponse.json({
    relationship: rel,
    notes: notes.data ?? [],
    contactHistory: history.data ?? [],
    scoreSnapshots: scores.data ?? [],
    outreachDrafts: drafts.data ?? [],
    sharedMemories: memories.data ?? [],
    photos: enrichedPhotos,
    documents: enrichedDocs,
    messageScreenshots: enrichedShots,
  })
}
