import { NextRequest, NextResponse } from 'next/server'
import {
  upsertMeaningExtraction,
  updateNarrativeIntegrationSession,
} from '@/lib/narrative-integration/actions'

export async function POST(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params
    const body = await req.json()
    const meaning = await upsertMeaningExtraction(sessionId, body)
    // also mirror final meaning onto session for quick access
    const session = await updateNarrativeIntegrationSession(sessionId, {
      meaning_statement: body.final_meaning_statement || body.user_selected_meaning || null,
      current_phase: 'present_grounding',
    })
    return NextResponse.json({ meaning, session })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to save meaning' },
      { status: 500 }
    )
  }
}
