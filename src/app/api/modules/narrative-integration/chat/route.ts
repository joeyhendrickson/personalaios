import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { env } from '@/lib/env'
import { defaultOpenaiModel } from '@/lib/ai/default-openai-model'
import { resolveOpenAIModelId } from '@/lib/ai/openai-model-id'
import {
  addNarrativeIntegrationMessage,
  getNarrativeIntegrationEvent,
  getNarrativeIntegrationSession,
  listNarrativeIntegrationMessages,
  updateNarrativeIntegrationSession,
  upsertMeaningExtraction,
  upsertFutureReorientation,
  upsertNarrativeIntegrationEventInventory,
} from '@/lib/narrative-integration/actions'
import { analyzeRuminationState, assessSafety } from '@/lib/narrative-integration/scoring'
import {
  narrativeIntegrationAssistantPrompt,
  stabilizationMessage,
} from '@/lib/narrative-integration/prompts'

type AiJson = {
  message: string
  next_phase?: any
  updates?: Record<string, any>
  event?: Record<string, any>
  meaning?: Record<string, any>
  future?: Record<string, any>
}

async function fetchUserContextSummary(supabase: any, userId: string) {
  const [goalsResult, projectsResult, habitsResult, prioritiesResult] = await Promise.all([
    supabase.from('goals').select('id,title').eq('user_id', userId).limit(8),
    supabase.from('projects').select('id,title').eq('user_id', userId).limit(8),
    supabase.from('daily_habits').select('id,title').eq('user_id', userId).limit(8),
    supabase.from('priorities').select('id,title').eq('user_id', userId).limit(8),
  ])

  const goals = (goalsResult.data || []).map((g: any) => `- ${g.title}`).join('\n')
  const projects = (projectsResult.data || []).map((p: any) => `- ${p.title}`).join('\n')
  const habits = (habitsResult.data || []).map((h: any) => `- ${h.title}`).join('\n')
  const priorities = (prioritiesResult.data || []).map((p: any) => `- ${p.title}`).join('\n')

  return `GOALS:\n${goals || '- (none found)'}\n\nPROJECTS:\n${projects || '- (none found)'}\n\nPRIORITIES:\n${priorities || '- (none found)'}\n\nHABITS:\n${habits || '- (none found)'}`
}

export async function POST(req: NextRequest) {
  try {
    if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY.trim() === '') {
      return NextResponse.json(
        {
          error: 'OpenAI API key not configured',
          details: 'Please add OPENAI_API_KEY to your environment variables',
        },
        { status: 500 }
      )
    }

    const body = await req.json()
    const sessionId = body.sessionId as string
    const message = (body.message as string) || ''
    if (!sessionId || !message.trim()) {
      return NextResponse.json({ error: 'sessionId and message are required' }, { status: 400 })
    }

    const session = await getNarrativeIntegrationSession(sessionId)

    // Store user message
    const safety = assessSafety(message)
    const prev = await listNarrativeIntegrationMessages(sessionId)
    const rumination = analyzeRuminationState(
      message,
      prev.map((m) => ({ role: m.role, content: m.content }))
    )

    await addNarrativeIntegrationMessage({
      session_id: sessionId,
      role: 'user',
      content: message,
      rumination_score: rumination.rumination_score,
      rumination_pattern: rumination.pattern,
      phase: session.current_phase,
    })

    // Safety gate: high risk -> stabilization only
    if (safety.safety_status === 'high_risk') {
      const updated = await updateNarrativeIntegrationSession(sessionId, {
        safety_status: 'high_risk',
        dissociation_indicators: safety.dissociation_indicators,
        current_phase: 'stabilization',
      })

      const resp = stabilizationMessage()
      const assistantMsg = await addNarrativeIntegrationMessage({
        session_id: sessionId,
        role: 'assistant',
        content: resp,
        rumination_score: rumination.rumination_score,
        rumination_pattern: rumination.pattern,
        phase: 'stabilization',
      })

      return NextResponse.json({
        response: resp,
        messageId: assistantMsg.id,
        session: updated,
      })
    }

    // Mild safety flags -> allow but slow down
    const nextSafetyStatus =
      safety.safety_status === 'needs_grounding' ? 'needs_grounding' : session.safety_status

    // Build prompt context
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const userContextSummary = user ? await fetchUserContextSummary(supabase, user.id) : ''

    const event = await getNarrativeIntegrationEvent(sessionId)

    const sessionSnapshot = {
      session: {
        id: session.id,
        title: session.title,
        current_phase: session.current_phase,
        safety_status: nextSafetyStatus,
        stress_level: session.stress_level,
        rumination_level: session.rumination_level,
        meaning_statement: session.meaning_statement,
        lesson_statement: session.lesson_statement,
        present_grounding_summary: session.present_grounding_summary,
        future_action: session.future_action,
      },
      event_inventory: event
        ? {
            event_name: event.event_name,
            what_happened_briefly: event.what_happened_briefly,
            emotional_impact: event.emotional_impact,
            what_question_keeps_repeating: event.what_question_keeps_repeating,
            what_belief_formed_afterward: event.what_belief_formed_afterward,
            how_it_affects_life_now: event.how_it_affects_life_now,
            frozen_belief: event.frozen_belief,
            current_reinterpretation: event.current_reinterpretation,
            extracted_lesson: event.extracted_lesson,
          }
        : null,
    }

    const system = narrativeIntegrationAssistantPrompt({
      phase: session.current_phase,
      safetyStatus: nextSafetyStatus,
      ruminationPattern: rumination.pattern,
      disableDeepProcessing: false,
      userContextSummary,
      sessionSnapshot,
    })

    const recent = prev
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }))

    const result = await generateText({
      model: defaultOpenaiModel(),
      messages: [
        { role: 'system', content: system },
        ...recent,
        { role: 'user', content: message },
      ],
      temperature: 0.6,
    })

    let parsed: AiJson = { message: result.text }
    try {
      parsed = JSON.parse(result.text)
    } catch {
      // allow fallback
      parsed = { message: result.text }
    }

    const nextPhase =
      (parsed.next_phase as any) ||
      (rumination.pattern === 'looping' ? rumination.recommended_next_phase : session.current_phase)

    const updates = parsed.updates || {}

    // Apply safety status if flagged
    if (nextSafetyStatus !== session.safety_status) updates.safety_status = nextSafetyStatus
    if (safety.dissociation_indicators) updates.dissociation_indicators = true

    // Persist optional event updates
    if (parsed.event && Object.keys(parsed.event).length > 0) {
      await upsertNarrativeIntegrationEventInventory(sessionId, parsed.event as any)
    }

    // Persist meaning/future if provided
    if (parsed.meaning && Object.keys(parsed.meaning).length > 0) {
      await upsertMeaningExtraction(sessionId, parsed.meaning as any)
      if (parsed.meaning.final_meaning_statement) {
        updates.meaning_statement = parsed.meaning.final_meaning_statement
      }
    }
    if (parsed.future && Object.keys(parsed.future).length > 0) {
      await upsertFutureReorientation(sessionId, parsed.future as any)
      if (parsed.future.next_action) updates.future_action = parsed.future.next_action
    }

    const updatedSession = await updateNarrativeIntegrationSession(sessionId, {
      ...updates,
      current_phase: nextPhase,
      rumination_level:
        updates.rumination_level ?? session.rumination_level ?? rumination.rumination_score,
      safety_status: updates.safety_status ?? session.safety_status,
    })

    const assistantMsg = await addNarrativeIntegrationMessage({
      session_id: sessionId,
      role: 'assistant',
      content: parsed.message || result.text,
      rumination_score: rumination.rumination_score,
      rumination_pattern: rumination.pattern,
      phase: updatedSession.current_phase,
    })

    return NextResponse.json({
      response: parsed.message || result.text,
      messageId: assistantMsg.id,
      session: updatedSession,
      rumination: rumination,
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    const model = resolveOpenAIModelId()

    console.error('Error in Narrative Integration chat API:', {
      error: errMsg,
      stack: error instanceof Error ? error.stack : undefined,
      hasOpenAIKey: !!env.OPENAI_API_KEY,
      openAIModel: model,
    })

    let userFacingError = errMsg
    if (errMsg.includes('model_not_found') || errMsg.includes('does not exist')) {
      userFacingError = `OpenAI model "${model}" is not available for your API key. Set OPENAI_MODEL in your environment to a model you have access to (e.g. gpt-4o-mini).`
    } else if (errMsg.includes('Incorrect API key') || errMsg.includes('invalid_api_key')) {
      userFacingError = 'OpenAI API key is invalid. Check your OPENAI_API_KEY environment variable.'
    } else if (errMsg.includes('Rate limit') || errMsg.includes('429')) {
      userFacingError = 'OpenAI rate limit reached. Please wait a moment and try again.'
    } else if (errMsg.includes('insufficient_quota')) {
      userFacingError = 'OpenAI quota exceeded. Check your billing at platform.openai.com.'
    }

    return NextResponse.json(
      {
        error: userFacingError,
        details: errMsg,
      },
      { status: 500 }
    )
  }
}
