import { NextRequest, NextResponse } from 'next/server'
import {
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
