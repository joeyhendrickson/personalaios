import { NextRequest, NextResponse } from 'next/server'
import {
  deleteNarrativeIntegrationSession,
  getNarrativeIntegrationSession,
  updateNarrativeIntegrationSession,
} from '@/lib/narrative-integration/actions'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params
    const session = await getNarrativeIntegrationSession(sessionId)
    return NextResponse.json({ session })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load session' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params
    const patch = await req.json()
    const session = await updateNarrativeIntegrationSession(sessionId, patch)
    return NextResponse.json({ session })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update session' },
      { status: 500 }
    )
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params
    await deleteNarrativeIntegrationSession(sessionId)
    return NextResponse.json({ message: 'Session deleted' }, { status: 200 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to delete session'
    const status = message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
