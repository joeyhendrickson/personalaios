import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DATING_MANAGER_BUCKET } from '@/lib/dating-manager/storage'

// DELETE: remove a single photo from a prospect (and from evaluation consideration).
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const { id: prospectId, photoId } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: photo } = await supabase
      .from('dating_prospect_photos')
      .select('id, storage_path, kind')
      .eq('id', photoId)
      .eq('prospect_id', prospectId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 })

    if (photo.storage_path) {
      await supabase.storage.from(DATING_MANAGER_BUCKET).remove([photo.storage_path as string])
    }

    const { error: delErr } = await supabase
      .from('dating_prospect_photos')
      .delete()
      .eq('id', photoId)
      .eq('user_id', user.id)
    if (delErr) throw new Error(delErr.message)

    // Keep the prospect's headline attractiveness score in sync with remaining photos.
    let attractiveness_score: number | null = null
    if (photo.kind === 'prospect') {
      const { data: latest } = await supabase
        .from('dating_prospect_photos')
        .select('analysis')
        .eq('prospect_id', prospectId)
        .eq('user_id', user.id)
        .eq('kind', 'prospect')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const score = (latest?.analysis as Record<string, unknown> | null)?.attractiveness_score
      attractiveness_score = typeof score === 'number' ? score : null

      await supabase
        .from('dating_prospects')
        .update({ attractiveness_score, updated_at: new Date().toISOString() })
        .eq('id', prospectId)
        .eq('user_id', user.id)
    }

    return NextResponse.json({ ok: true, attractiveness_score })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to delete photo' },
      { status: 500 }
    )
  }
}
