import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const messageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

const createSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  messages: z.array(messageSchema).default([]),
})

function deriveTitle(messages: { role: string; content: string }[]): string {
  const firstUser = messages.find((m) => m.role === 'user' && m.content.trim())
  const base = (firstUser?.content || 'New chat').trim().replace(/\s+/g, ' ')
  return base.length > 60 ? `${base.slice(0, 57)}...` : base
}

// GET /api/assistant/chats — list saved sessions (no messages, for the picker)
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('assistant_chat_sessions')
    .select('id, title, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sessions: data || [] })
}

// POST /api/assistant/chats — create a new saved session
export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = createSchema.parse(await req.json())
    const title = body.title?.trim() || deriveTitle(body.messages)

    const { data, error } = await supabase
      .from('assistant_chat_sessions')
      .insert({
        user_id: user.id,
        title,
        messages: body.messages,
      })
      .select('id, title, created_at, updated_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ session: data }, { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Invalid request' },
      { status: 400 }
    )
  }
}
