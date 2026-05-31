import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { DATING_MANAGER_BUCKET } from '@/lib/dating-manager/storage'

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  status: z.enum(['active', 'archived']).optional(),
  zip_code: z.string().max(20).nullable().optional(),
  how_we_met: z.string().max(4000).nullable().optional(),
  positive_qualities: z.string().max(8000).nullable().optional(),
  toxic_qualities: z.string().max(8000).nullable().optional(),
  unknowns: z.string().max(8000).nullable().optional(),
  feels_known: z.string().max(8000).nullable().optional(),
  conflict_style: z.string().max(8000).nullable().optional(),
  notes: z.string().max(8000).nullable().optional(),
  assessment: z.record(z.string(), z.unknown()).optional(),
})

// GET: prospect detail + photos (with signed URLs) + latest evaluation
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: prospect } = await supabase
      .from('dating_prospects')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: photoRows } = await supabase
      .from('dating_prospect_photos')
      .select('id, storage_path, kind, analysis, created_at')
      .eq('prospect_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const photos = await Promise.all(
      (photoRows ?? []).map(async (p) => {
        const { data: signed } = await supabase.storage
          .from(DATING_MANAGER_BUCKET)
          .createSignedUrl(p.storage_path as string, 3600)
        return { ...p, signed_url: signed?.signedUrl ?? null }
      })
    )

    const { data: evaluation } = await supabase
      .from('dating_evaluations')
      .select('result, created_at')
      .eq('prospect_id', id)
      .eq('user_id', user.id)
      .eq('scope', 'prospect')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ prospect, photos, evaluation: evaluation ?? null })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch prospect' },
      { status: 500 }
    )
  }
}

// PATCH: update prospect fields
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const patch = updateSchema.parse(body)

    const { data, error } = await supabase
      .from('dating_prospects')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ prospect: data })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: e.issues }, { status: 400 })
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update prospect' },
      { status: 500 }
    )
  }
}

// DELETE: remove prospect (and its photos/evaluations via cascade)
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Best-effort: remove stored files for this prospect.
    const { data: photoRows } = await supabase
      .from('dating_prospect_photos')
      .select('storage_path')
      .eq('prospect_id', id)
      .eq('user_id', user.id)
    const paths = (photoRows ?? []).map((p) => p.storage_path as string).filter(Boolean)
    if (paths.length > 0) {
      await supabase.storage.from(DATING_MANAGER_BUCKET).remove(paths)
    }

    const { error } = await supabase
      .from('dating_prospects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to delete prospect' },
      { status: 500 }
    )
  }
}
