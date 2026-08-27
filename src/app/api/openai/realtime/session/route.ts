import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assembleAIContext } from '@/lib/ai-context/assemble-context'
import { env } from '@/lib/env'
import { resolveOpenAIRealtimeModelId } from '@/lib/ai/openai-model-id'
import { logAIUsage } from '@/lib/ai/usage-logger'
import {
  buildRealtimeAdvisorInstructions,
  buildRealtimeSessionConfig,
  openaiSafetyIdentifier,
} from '@/lib/voice/realtime-config'

export const maxDuration = 30

export async function POST(req: Request) {
  const started = Date.now()
  const apiKey = env.OPENAI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key is not configured' }, { status: 500 })
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const sdp = await req.text()
  if (!sdp.trim()) {
    return NextResponse.json({ error: 'SDP offer is required' }, { status: 400 })
  }

  const url = new URL(req.url)
  const language = url.searchParams.get('language') === 'es' ? 'es' : 'en'
  const currentModule = url.searchParams.get('currentModule')?.trim() || undefined

  let systemContext =
    'USER CONTEXT: Unavailable this turn. Answer helpfully from the conversation without inventing dashboard facts.'
  try {
    const assembled = await assembleAIContext(user.id, {
      currentModule,
    })
    if (assembled.systemContext?.trim()) {
      systemContext = assembled.systemContext
    }
  } catch (error) {
    console.error('[realtime session] context assembly failed:', error)
  }

  const session = buildRealtimeSessionConfig({
    instructions: buildRealtimeAdvisorInstructions({
      systemContext,
      language,
      currentModule,
    }),
  })

  const form = new FormData()
  form.set('sdp', sdp)
  form.set('session', JSON.stringify(session))

  const model = resolveOpenAIRealtimeModelId()
  const response = await fetch('https://api.openai.com/v1/realtime/calls', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'OpenAI-Safety-Identifier': openaiSafetyIdentifier(user.id),
    },
    body: form,
  })

  const answerSdp = await response.text()
  await logAIUsage({
    userId: user.id,
    module: 'chat',
    action: 'realtime_session',
    route: '/api/openai/realtime/session',
    model,
    provider: 'openai',
    status: response.ok ? 'ok' : 'error',
    latencyMs: Date.now() - started,
    error: response.ok ? null : answerSdp.slice(0, 500),
    metadata: { language, currentModule: currentModule ?? null },
  })

  if (!response.ok) {
    console.error('[realtime session] OpenAI SDP exchange failed:', response.status, answerSdp)
    return NextResponse.json(
      { error: 'Failed to start realtime voice session', details: answerSdp.slice(0, 400) },
      { status: response.status >= 400 && response.status < 600 ? response.status : 502 }
    )
  }

  return new Response(answerSdp, {
    headers: { 'Content-Type': 'application/sdp' },
  })
}
