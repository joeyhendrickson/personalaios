import { NextRequest, NextResponse } from 'next/server'
import {
  createMeaningExtraction,
  deleteMeaningExtraction,
  listMeaningExtractions,
  syncSessionMeaningStatement,
  updateMeaningExtraction,
  updateNarrativeIntegrationSession,
} from '@/lib/narrative-integration/actions'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params
    const meanings = await listMeaningExtractions(sessionId)
    return NextResponse.json({ meanings })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load meanings' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params
    const body = await req.json()
    const { id, advance_phase, ...fields } = body

    const meaning = id
      ? await updateMeaningExtraction(sessionId, id as string, fields)
      : await createMeaningExtraction(sessionId, fields)

    const session = await syncSessionMeaningStatement(sessionId)

    if (advance_phase) {
      const advanced = await updateNarrativeIntegrationSession(sessionId, {
        current_phase: 'present_grounding',
      })
      return NextResponse.json({ meaning, session: advanced })
    }

    return NextResponse.json({ meaning, session })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to save meaning' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params
    const { searchParams } = new URL(req.url)
    const meaningId = searchParams.get('id')
    if (!meaningId) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 })
    }

    await deleteMeaningExtraction(sessionId, meaningId)
    const session = await syncSessionMeaningStatement(sessionId)
    const meanings = await listMeaningExtractions(sessionId)
    return NextResponse.json({ meanings, session })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to delete meaning' },
      { status: 500 }
    )
  }
}
