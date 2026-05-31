import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DATING_MANAGER_BUCKET, buildDatingStoragePath } from '@/lib/dating-manager/storage'
import { scoreProspectPhoto, analyzeCouplePhoto } from '@/lib/dating-manager/vision'
import { buildUserVisionContext } from '@/lib/dating-manager/context'

const ALLOWED_IMAGE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_BYTES = 15 * 1024 * 1024

// POST: upload a prospect photo (kind=prospect → attractiveness) or couple photo
// (kind=couple → emotional connection). Runs AI vision on the buffer at upload time.
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: prospectId } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: prospect } = await supabase
      .from('dating_prospects')
      .select('id, name')
      .eq('id', prospectId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })

    const form = await request.formData()
    const file = form.get('file')
    const kind = form.get('kind') === 'couple' ? 'couple' : 'prospect'

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }
    if (file.type && !ALLOWED_IMAGE.has(file.type)) {
      return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    if (buf.length > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 15MB)' }, { status: 400 })
    }
    const mimeType = file.type || 'image/jpeg'

    const folder = kind === 'couple' ? 'couple-photos' : 'prospect-photos'
    const path = buildDatingStoragePath(user.id, prospectId, folder, file.name)

    const { error: upErr } = await supabase.storage
      .from(DATING_MANAGER_BUCKET)
      .upload(path, buf, { contentType: mimeType, upsert: false })
    if (upErr) {
      return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 })
    }

    const route = `/api/dating-manager/prospects/${prospectId}/photos`
    let analysis: Record<string, unknown>

    if (kind === 'couple') {
      analysis = (await analyzeCouplePhoto(buf, mimeType, prospect.name as string, {
        userId: user.id,
        route,
      })) as unknown as Record<string, unknown>
    } else {
      const vision = await buildUserVisionContext(supabase, user.id)
      const scored = await scoreProspectPhoto(buf, mimeType, vision.combined, {
        userId: user.id,
        route,
      })
      analysis = scored as unknown as Record<string, unknown>
      // Keep the prospect's headline attractiveness score in sync with the latest photo.
      await supabase
        .from('dating_prospects')
        .update({
          attractiveness_score: scored.attractiveness_score,
          updated_at: new Date().toISOString(),
        })
        .eq('id', prospectId)
        .eq('user_id', user.id)
    }

    const { data: photoRow, error: insErr } = await supabase
      .from('dating_prospect_photos')
      .insert({
        user_id: user.id,
        prospect_id: prospectId,
        storage_path: path,
        kind,
        analysis,
      })
      .select('id, storage_path, kind, analysis, created_at')
      .single()
    if (insErr) throw new Error(insErr.message)

    const { data: signed } = await supabase.storage
      .from(DATING_MANAGER_BUCKET)
      .createSignedUrl(path, 3600)

    return NextResponse.json(
      { photo: { ...photoRow, signed_url: signed?.signedUrl ?? null } },
      { status: 201 }
    )
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to upload photo' },
      { status: 500 }
    )
  }
}
