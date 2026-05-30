import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { sendHealthAccessRequestEmail } from '@/lib/email'

const schema = z.object({
  email: z.string().email('A valid Google email is required'),
  note: z.string().max(1000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { email, note } = schema.parse(body)

    const result = await sendHealthAccessRequestEmail({
      googleEmail: email,
      accountEmail: user.email || 'unknown@example.com',
      note,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Could not send request' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit request' },
      { status: 500 }
    )
  }
}
