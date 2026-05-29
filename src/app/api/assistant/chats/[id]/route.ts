import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const messageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  messages: z.array(messageSchema).optional(),
})

// GET /api/assistant/chats/[id] — load a single session with messages
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
    .select('id, title, messages, created_at, updated_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
  }

  return NextResponse.json({ session: data })
}

// PATCH /api/assistant/chats/[id] — rename and/or update messages
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = updateSchema.parse(await req.json())
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.title !== undefined) update.title = body.title.trim()
    if (body.messages !== undefined) update.messages = body.messages

    const { data, error } = await supabase
      .from('assistant_chat_sessions')
      .update(update)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, title, created_at, updated_at')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Chat not found' }, { status: 404 })
    }

    return NextResponse.json({ session: data })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Invalid request' },
      { status: 400 }
    )
  }
}

// DELETE /api/assistant/chats/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('assistant_chat_sessions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ status: 'deleted' })
}
