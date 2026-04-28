import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  relationship_type: z
    .enum(['family', 'friend', 'colleague', 'business', 'mentor', 'acquaintance'])
    .optional(),
  contact_frequency_days: z.number().min(1).max(365).optional(),
  notes: z.string().max(20000).optional().or(z.literal('')),
  priority_level: z.number().min(1).max(5).optional(),
  zip_code: z.string().max(20).optional().or(z.literal('')),
  profession: z.string().max(500).optional().or(z.literal('')),
  years_known: z.number().min(0).max(120).optional().nullable(),
  interests: z.string().max(20000).optional().or(z.literal('')),
  vision: z.string().max(20000).optional().or(z.literal('')),
  habits: z.string().max(20000).optional().or(z.literal('')),
})

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = patchSchema.parse(body)

    const updates: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (v === undefined) continue
      if (v === '') updates[k] = null
      else updates[k] = v
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: row, error } = await supabase
      .from('relationships')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .maybeSingle()

    if (error) {
      console.error('relationship PATCH', error)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ relationship: row })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid body', details: e.issues }, { status: 400 })
    }
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
