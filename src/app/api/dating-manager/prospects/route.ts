import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  zip_code: z.string().max(20).optional(),
  how_we_met: z.string().max(2000).optional(),
})

// GET: list prospects for this user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const status = request.nextUrl.searchParams.get('status') || 'active'

    const { data, error } = await supabase
      .from('dating_prospects')
      .select(
        'id, name, status, zip_code, positive_qualities, toxic_qualities, attractiveness_score, updated_at'
      )
      .eq('user_id', user.id)
      .eq('status', status)
      .order('updated_at', { ascending: false })

    if (error) throw new Error(error.message)
    return NextResponse.json({ prospects: data ?? [] })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list prospects' },
      { status: 500 }
    )
  }
}

// POST: create a prospect
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const input = createSchema.parse(body)

    const { data, error } = await supabase
      .from('dating_prospects')
      .insert({
        user_id: user.id,
        name: input.name,
        zip_code: input.zip_code || null,
        how_we_met: input.how_we_met || null,
      })
      .select('id, name, status, zip_code, updated_at')
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ prospect: data }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: e.issues }, { status: 400 })
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create prospect' },
      { status: 500 }
    )
  }
}
