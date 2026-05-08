import { NextRequest, NextResponse } from 'next/server'
import {
  getNarrativeIntegrationEvent,
  upsertNarrativeIntegrationEventInventory,
} from '@/lib/narrative-integration/actions'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params
    const event = await getNarrativeIntegrationEvent(sessionId)
    return NextResponse.json({ event })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load event' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params
    const inventory = await req.json()
    const event = await upsertNarrativeIntegrationEventInventory(sessionId, inventory)
    return NextResponse.json({ event })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to save inventory' },
      { status: 500 }
    )
  }
}
