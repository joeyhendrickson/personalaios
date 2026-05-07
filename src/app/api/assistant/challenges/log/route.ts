import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const bodySchema = z.object({
  message: z.string().min(10).max(4000),
  context: z.string().max(4000).optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
  severity: z.enum(['low', 'normal', 'high']).optional(),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = bodySchema.parse(await req.json())

  const { error } = await supabase.from('user_reported_challenges').insert({
    user_id: user.id,
    source: 'productivity_advisor',
    message: body.message,
    context: body.context ?? null,
    tags: body.tags ?? [],
    severity: body.severity ?? 'normal',
    status: 'open',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
