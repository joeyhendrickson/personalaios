import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MIN_WORDS_FOR_ANALYSIS } from '@/lib/write-in-my-voice/constants'
import { resolveUserOpenAIKey } from '@/lib/write-in-my-voice/openai-key'
import { WriteInMyVoiceAnalyzer } from '@/lib/write-in-my-voice/voice-analyzer'
import { syncVoiceCorpusToPinecone } from '@/lib/write-in-my-voice/sync-voice-corpus'

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const openaiKey = await resolveUserOpenAIKey(user.id)
    if (!openaiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 400 })
    }

    const { data: samples, error: samplesError } = await supabase
      .from('write_in_my_voice_samples')
      .select('id, source_type, content_text, file_name')
      .eq('user_id', user.id)

    if (samplesError) {
      return NextResponse.json({ error: samplesError.message }, { status: 500 })
    }

    if (!samples?.length) {
      return NextResponse.json({ error: 'Upload writing samples first' }, { status: 400 })
    }

    const totalWords = samples.reduce(
      (sum, s) => sum + (s.content_text?.split(/\s+/).filter(Boolean).length ?? 0),
      0
    )

    if (totalWords < MIN_WORDS_FOR_ANALYSIS) {
      return NextResponse.json(
        {
          error: `Need at least ${MIN_WORDS_FOR_ANALYSIS} words across samples (currently ${totalWords})`,
        },
        { status: 400 }
      )
    }

    const analyzer = new WriteInMyVoiceAnalyzer(openaiKey, {
      userId: user.id,
      route: '/api/write-in-my-voice/analyze',
    })

    const result = await analyzer.analyzeVoice(samples)

    const { error: profileError } = await supabase.from('write_in_my_voice_profiles').upsert(
      {
        user_id: user.id,
        voice_profile: result.voice_profile,
        sample_count: samples.length,
        total_words: totalWords,
        confidence_score: result.confidence_score,
        last_analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    await syncVoiceCorpusToPinecone({
      userId: user.id,
      samples,
      voiceProfile: result.voice_profile,
    })

    return NextResponse.json({
      voice_profile: result.voice_profile,
      confidence_score: result.confidence_score,
      sample_analysis: result.sample_analysis,
      sample_count: samples.length,
      total_words: totalWords,
    })
  } catch (error) {
    console.error('[write-in-my-voice/analyze POST]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}
