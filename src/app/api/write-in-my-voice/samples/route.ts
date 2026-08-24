import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  MAX_SAMPLES_PER_USER,
  MAX_UPLOAD_BYTES,
  SOURCE_TYPES,
} from '@/lib/write-in-my-voice/constants'
import {
  countWords,
  inferSourceType,
  isAcceptedFileName,
  parseUploadedSampleContent,
} from '@/lib/write-in-my-voice/parse-sample'
import {
  syncVoiceCorpusToPinecone,
  deleteVoiceCorpusForSample,
} from '@/lib/write-in-my-voice/sync-voice-corpus'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: samples, error } = await supabase
      .from('write_in_my_voice_samples')
      .select('id, source_type, file_name, word_count, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const totalWords = (samples ?? []).reduce((sum, s) => sum + (s.word_count ?? 0), 0)

    return NextResponse.json({
      samples: samples ?? [],
      totalWords,
      sampleCount: samples?.length ?? 0,
    })
  } catch (error) {
    console.error('[write-in-my-voice/samples GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const sourceTypeRaw = formData.get('source_type') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!isAcceptedFileName(file.name)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Use .txt, .md, .json, .csv, or .html' },
        { status: 400 }
      )
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File exceeds 5 MB limit' }, { status: 400 })
    }

    const { count } = await supabase
      .from('write_in_my_voice_samples')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if ((count ?? 0) >= MAX_SAMPLES_PER_USER) {
      return NextResponse.json(
        { error: `Maximum ${MAX_SAMPLES_PER_USER} samples allowed` },
        { status: 400 }
      )
    }

    const raw = await file.text()
    const contentText = parseUploadedSampleContent(file.name, raw)
    const wordCount = countWords(contentText)

    if (wordCount < 20) {
      return NextResponse.json(
        { error: 'File contains too little text (minimum 20 words)' },
        { status: 400 }
      )
    }

    const sourceType = inferSourceType(file.name, sourceTypeRaw ?? undefined)
    if (!SOURCE_TYPES.includes(sourceType)) {
      return NextResponse.json({ error: 'Invalid source type' }, { status: 400 })
    }

    const { data: sample, error: insertError } = await supabase
      .from('write_in_my_voice_samples')
      .insert({
        user_id: user.id,
        source_type: sourceType,
        file_name: file.name,
        content_text: contentText,
        word_count: wordCount,
        metadata: { original_size: file.size },
      })
      .select('id, source_type, file_name, word_count, created_at')
      .single()

    if (insertError || !sample) {
      return NextResponse.json({ error: insertError?.message ?? 'Insert failed' }, { status: 500 })
    }

    const { data: allSamples } = await supabase
      .from('write_in_my_voice_samples')
      .select('id, source_type, content_text, file_name')
      .eq('user_id', user.id)

    const { data: profile } = await supabase
      .from('write_in_my_voice_profiles')
      .select('voice_profile')
      .eq('user_id', user.id)
      .single()

    await syncVoiceCorpusToPinecone({
      userId: user.id,
      samples: allSamples ?? [],
      voiceProfile: profile?.voice_profile ?? null,
    })

    return NextResponse.json({ sample })
  } catch (error) {
    console.error('[write-in-my-voice/samples POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing sample id' }, { status: 400 })
    }

    await deleteVoiceCorpusForSample(user.id, id)

    const { error } = await supabase
      .from('write_in_my_voice_samples')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: remaining } = await supabase
      .from('write_in_my_voice_samples')
      .select('id, source_type, content_text, file_name')
      .eq('user_id', user.id)

    const { data: profile } = await supabase
      .from('write_in_my_voice_profiles')
      .select('voice_profile')
      .eq('user_id', user.id)
      .single()

    await syncVoiceCorpusToPinecone({
      userId: user.id,
      samples: remaining ?? [],
      voiceProfile: profile?.voice_profile ?? null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[write-in-my-voice/samples DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
