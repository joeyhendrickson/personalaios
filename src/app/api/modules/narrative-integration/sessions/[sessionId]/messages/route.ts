import { NextRequest, NextResponse } from 'next/server'
import { listNarrativeIntegrationMessages } from '@/lib/narrative-integration/actions'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params
    const messages = await listNarrativeIntegrationMessages(sessionId)
    const simplified = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ id: m.id, role: m.role, content: m.content, created_at: m.created_at }))
    return NextResponse.json({ messages: simplified })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load messages' },
      { status: 500 }
    )
  }
}
