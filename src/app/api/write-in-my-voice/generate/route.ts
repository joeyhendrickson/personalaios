import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'
import { MATERIAL_TYPES } from '@/lib/write-in-my-voice/constants'
import type { VoiceMaterialType } from '@/lib/write-in-my-voice/constants'
import { buildCrossContextForGeneration } from '@/lib/write-in-my-voice/cross-context'
import { generateVoiceContent } from '@/lib/write-in-my-voice/generate'
import { resolveUserOpenAIKey } from '@/lib/write-in-my-voice/openai-key'
import type { VoiceProfile } from '@/lib/write-in-my-voice/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { material_type, prompt } = body as {
      material_type?: string
      prompt?: string
    }

    if (!material_type || !prompt?.trim()) {
      return NextResponse.json({ error: 'material_type and prompt are required' }, { status: 400 })
    }

    if (!MATERIAL_TYPES.includes(material_type as VoiceMaterialType)) {
      return NextResponse.json({ error: 'Invalid material_type' }, { status: 400 })
    }

    const { data: profileRow, error: profileError } = await supabase
      .from('write_in_my_voice_profiles')
      .select('voice_profile')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profileRow?.voice_profile) {
      return NextResponse.json(
        { error: 'No voice profile found. Upload samples and run voice analysis first.' },
        { status: 400 }
      )
    }

    const openaiKey = await resolveUserOpenAIKey(user.id)
    if (!openaiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 400 })
    }

    const crossContext = await buildCrossContextForGeneration({
      userId: user.id,
      prompt: prompt.trim(),
    })

    const generated = await generateVoiceContent({
      userId: user.id,
      openaiKey,
      voiceProfile: profileRow.voice_profile as VoiceProfile,
      materialType: material_type as VoiceMaterialType,
      prompt: prompt.trim(),
      crossContext,
      route: '/api/write-in-my-voice/generate',
    })

    if (!generated.content.trim()) {
      return NextResponse.json({ error: 'Generation produced empty content' }, { status: 500 })
    }

    const draftId = uuidv4()
    const { data: draft, error: draftError } = await supabase
      .from('write_in_my_voice_drafts')
      .insert({
        id: draftId,
        user_id: user.id,
        material_type,
        prompt: prompt.trim(),
        title: generated.title ?? null,
        content: generated.content,
        voice_match_score: generated.voice_match_score,
        cross_context_modules: crossContext.relevantModules,
        generation_params: {
          voice_corpus_excerpt_count: crossContext.voiceCorpusExcerpts.length,
          had_cross_module_context: Boolean(crossContext.crossModuleContext),
        },
      })
      .select('*')
      .single()

    if (draftError) {
      return NextResponse.json({ error: draftError.message }, { status: 500 })
    }

    return NextResponse.json({
      draft,
      cross_context_modules: crossContext.relevantModules,
    })
  } catch (error) {
    console.error('[write-in-my-voice/generate POST]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}
