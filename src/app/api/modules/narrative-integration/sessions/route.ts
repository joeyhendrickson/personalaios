import { NextRequest, NextResponse } from 'next/server'
import {
  listNarrativeIntegrationSessions,
  createNarrativeIntegrationSession,
} from '@/lib/narrative-integration/actions'

export async function GET() {
  try {
    const sessions = await listNarrativeIntegrationSessions()
    return NextResponse.json({ sessions })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list sessions' },
      { status: 500 }
    )
  }
}

export async function POST(_req: NextRequest) {
  try {
    const session = await createNarrativeIntegrationSession({
      current_phase: 'state_check',
      safety_status: 'ok',
      stress_level: 5,
      rumination_level: 5,
    })
    return NextResponse.json({ session })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create session' },
      { status: 500 }
    )
  }
}
