import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'
import OpenAI from 'openai'
import { toOpenAiImageFile } from '@/lib/fitness/prepare-image-for-openai'

// Image generation can take a while; allow a generous timeout.
export const runtime = 'nodejs'
export const maxDuration = 300

const IMAGE_MODEL = 'gpt-image-1.5'
const BUCKET = 'body-photos'
const ALLOWED_TIMEFRAMES = [3, 6, 9, 12]

type FutureStateRecord = {
  user_id: string
  image_url: string
  timeframe_months: number
  source_photo_ids: string[]
  prompt?: string
}

async function insertFutureStateRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  record: FutureStateRecord
) {
  let insertRes = await supabase.from('fitness_future_states').insert(record).select().single()

  if (insertRes.error) {
    const code = insertRes.error.code
    const message = (insertRes.error.message || '').toLowerCase()

    if (code === '42P01' || message.includes('does not exist')) {
      return { data: null, error: insertRes.error, missingTable: true as const }
    }

    try {
      const { createAdminClient } = await import('@/lib/supabaseAdmin')
      const admin = createAdminClient()
      insertRes = await admin.from('fitness_future_states').insert(record).select().single()
    } catch (adminErr) {
      console.error('[future-state] admin insert fallback failed:', adminErr)
    }
  }

  return {
    data: insertRes.data,
    error: insertRes.error,
    missingTable: false as const,
  }
}

function storagePathFromPublicUrl(imageUrl: string): string | null {
  const marker = `/${BUCKET}/`
  const idx = imageUrl.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(imageUrl.slice(idx + marker.length).split('?')[0])
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const downloadId = searchParams.get('download')

    if (downloadId) {
      const { data: row, error } = await supabase
        .from('fitness_future_states')
        .select('image_url, timeframe_months, created_at')
        .eq('id', downloadId)
        .eq('user_id', user.id)
        .single()

      if (error || !row?.image_url) {
        return NextResponse.json({ error: 'Future state not found' }, { status: 404 })
      }

      const path = storagePathFromPublicUrl(row.image_url)
      let buffer: Buffer | null = null

      if (path) {
        const { data, error: downloadError } = await supabase.storage.from(BUCKET).download(path)
        if (!downloadError && data) {
          buffer = Buffer.from(await data.arrayBuffer())
        }
      }

      if (!buffer) {
        try {
          const res = await fetch(row.image_url, { cache: 'no-store' })
          if (res.ok) buffer = Buffer.from(await res.arrayBuffer())
        } catch {
          // fall through
        }
      }

      if (!buffer) {
        return NextResponse.json({ error: 'Could not load image' }, { status: 404 })
      }

      const date = new Date(row.created_at).toISOString().slice(0, 10)
      const filename = `lifestacks-future-${row.timeframe_months}mo-${date}.png`
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'private, no-store',
        },
      })
    }

    const { data, error } = await supabase
      .from('fitness_future_states')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      // Table may not exist yet (pre-migration) — treat as empty.
      if (error.code === '42P01') return NextResponse.json([])
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data || [])
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch future states' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY.trim() === '') {
      return NextResponse.json(
        { error: 'OpenAI API key not configured', details: 'Add OPENAI_API_KEY to environment.' },
        { status: 500 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const timeframe = ALLOWED_TIMEFRAMES.includes(Number(body?.timeframe_months))
      ? Number(body.timeframe_months)
      : 6

    // Most recent 1-5 body photos to use as visual references.
    const { data: photos, error: photosError } = await supabase
      .from('body_photos')
      .select('id, photo_url, photo_type, target_areas, body_type_goal')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false })
      .limit(5)

    if (photosError) {
      return NextResponse.json({ error: 'Failed to load body photos' }, { status: 500 })
    }
    if (!photos || photos.length === 0) {
      return NextResponse.json(
        { error: 'Upload at least one body photo before generating a future state.' },
        { status: 400 }
      )
    }

    // Latest workout & nutrition plans for context.
    const [{ data: workout }, { data: nutrition }] = await Promise.all([
      supabase
        .from('workout_plans')
        .select(
          'plan_name, plan_type, difficulty_level, frequency_per_week, target_areas, description'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('nutrition_plans')
        .select('plan_name, plan_type, diet_type, daily_calories, protein_grams, description')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const targetAreas = Array.from(
      new Set(photos.flatMap((p) => (Array.isArray(p.target_areas) ? p.target_areas : [])))
    )
    const bodyTypeGoal = photos.find((p) => p.body_type_goal)?.body_type_goal || 'lean and healthy'

    const workoutSummary = workout
      ? `Workout plan "${workout.plan_name}" (${workout.plan_type}, ${workout.frequency_per_week}x/week, ${workout.difficulty_level}). ${workout.description || ''}`
      : 'A consistent, progressive resistance + cardio routine.'
    const nutritionSummary = nutrition
      ? `Nutrition plan "${nutrition.plan_name}" (${nutrition.plan_type}${nutrition.diet_type ? `, ${nutrition.diet_type}` : ''}, ~${nutrition.daily_calories || 'balanced'} kcal/day, ${nutrition.protein_grams || 'adequate'}g protein). ${nutrition.description || ''}`
      : 'A balanced, high-protein, whole-food nutrition plan.'

    const prompt = `Create a realistic, photorealistic progress projection of THIS SAME PERSON showing how their physique could realistically look after ${timeframe} months of consistent training and nutrition.

Preserve the person's identity, face, skin tone, hair, gender, age, and the general pose, framing, background, and lighting of the reference photo(s). Do NOT change who they are.

Show a realistic, achievable ${timeframe}-month transformation: ${
      timeframe <= 3
        ? 'subtle but visible improvements'
        : timeframe <= 6
          ? 'clearly noticeable improvements'
          : 'substantial, well-developed improvements'
    } in muscle tone, posture, and reduced excess body fat, especially in these target areas: ${
      targetAreas.length ? targetAreas.join(', ') : 'overall physique'
    }. Aim for a "${bodyTypeGoal}" look.

This reflects following:
- ${workoutSummary}
- ${nutritionSummary}

Keep it natural and realistic for the timeframe (no exaggerated or cartoonish bodybuilder proportions). Tasteful, same clothing style as the reference. This is a fitness motivation visualization.`

    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

    async function loadPhotoBytes(photoUrl: string): Promise<Buffer | null> {
      try {
        const res = await fetch(photoUrl, { cache: 'no-store' })
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer())
          if (buf.length > 0) return buf
        }
      } catch {
        // try storage fallback below
      }

      try {
        const marker = `/${BUCKET}/`
        const idx = photoUrl.indexOf(marker)
        if (idx === -1) return null
        const path = decodeURIComponent(photoUrl.slice(idx + marker.length).split('?')[0])
        const { data, error } = await supabase.storage.from(BUCKET).download(path)
        if (!error && data) {
          return Buffer.from(await data.arrayBuffer())
        }
      } catch {
        // non-fatal
      }
      return null
    }

    // Use the most recent readable photo, normalized to PNG for images.edit.
    let referenceFile: Awaited<ReturnType<typeof toOpenAiImageFile>> | null = null
    let sourcePhotoId: string | null = null
    const loadErrors: string[] = []

    for (const p of photos) {
      try {
        const raw = await loadPhotoBytes(p.photo_url)
        if (!raw) {
          loadErrors.push(`Could not download photo ${p.id}`)
          continue
        }
        referenceFile = await toOpenAiImageFile(raw, `reference-${p.id}.png`)
        sourcePhotoId = p.id
        break
      } catch (err) {
        loadErrors.push(
          err instanceof Error ? err.message : `Could not prepare photo ${p.id} for generation`
        )
      }
    }

    if (!referenceFile) {
      return NextResponse.json(
        {
          error: 'Could not read your body photos to generate a future state.',
          details: loadErrors[0] || 'Upload a JPG, PNG, or HEIC body photo and try again.',
        },
        { status: 400 }
      )
    }

    let b64: string | undefined
    let lastEditError: string | null = null
    try {
      const result = await openai.images.edit({
        model: IMAGE_MODEL,
        image: referenceFile,
        prompt,
        size: '1024x1536',
        quality: 'medium',
        input_fidelity: 'high',
      })
      b64 = result.data?.[0]?.b64_json
    } catch (e: unknown) {
      lastEditError =
        e instanceof Error ? e.message : 'The image model could not generate a result.'
      console.error('Future state image generation failed:', lastEditError)
    }

    // If the primary photo fails, try the next recent uploads one at a time.
    if (!b64 && photos.length > 1) {
      for (const p of photos) {
        if (p.id === sourcePhotoId) continue
        try {
          const raw = await loadPhotoBytes(p.photo_url)
          if (!raw) continue
          const altFile = await toOpenAiImageFile(raw, `reference-${p.id}.png`)
          const result = await openai.images.edit({
            model: IMAGE_MODEL,
            image: altFile,
            prompt,
            size: '1024x1536',
            quality: 'medium',
            input_fidelity: 'high',
          })
          b64 = result.data?.[0]?.b64_json
          if (b64) {
            sourcePhotoId = p.id
            break
          }
        } catch (e: unknown) {
          lastEditError = e instanceof Error ? e.message : lastEditError
        }
      }
    }

    if (!b64) {
      return NextResponse.json(
        {
          error: 'Image generation failed',
          details:
            lastEditError ||
            'The image model could not process your photo. Try uploading a clear front-facing JPG or PNG.',
        },
        { status: 502 }
      )
    }

    if (!b64) {
      return NextResponse.json(
        { error: 'No image was generated. Please try again.' },
        { status: 502 }
      )
    }

    // Upload the generated image to storage.
    const imageBuffer = Buffer.from(b64, 'base64')
    const fileName = `${user.id}/future/${timeframe}m-${Date.now()}.png`

    const uploadWith = (client: typeof supabase) =>
      client.storage.from(BUCKET).upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: false,
      })

    let { error: uploadError } = await uploadWith(supabase)
    if (uploadError) {
      try {
        const { createAdminClient } = await import('@/lib/supabaseAdmin')
        const admin = createAdminClient()
        const msg = (uploadError.message || '').toLowerCase()
        if (msg.includes('not found')) {
          await admin.storage
            .createBucket(BUCKET, { public: true, fileSizeLimit: 15 * 1024 * 1024 })
            .catch(() => {})
        }
        const retry = await uploadWith(admin as unknown as typeof supabase)
        uploadError = retry.error
      } catch (adminErr) {
        console.error('[future-state] admin upload fallback failed:', adminErr)
      }
    }

    if (uploadError) {
      return NextResponse.json(
        { error: 'Failed to store generated image', details: uploadError.message },
        { status: 500 }
      )
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(fileName)

    const record: FutureStateRecord = {
      user_id: user.id,
      image_url: publicUrl,
      timeframe_months: timeframe,
      source_photo_ids: photos.map((p) => p.id),
      prompt,
    }
    const insertResult = await insertFutureStateRecord(supabase, record)

    if (insertResult.error || !insertResult.data) {
      console.error('Error saving future state record:', insertResult.error)
      const warning = insertResult.missingTable
        ? 'Generated, but not saved to your gallery yet — click Save to keep it after running migration 073.'
        : 'Generated, but could not be saved to your gallery — click Save to retry.'
      return NextResponse.json({
        success: true,
        future_state: {
          id: `temp-${Date.now()}`,
          ...record,
          created_at: new Date().toISOString(),
        },
        saved: false,
        warning,
      })
    }

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'fitness_future_state_generated',
      description: `Generated ${timeframe}-month future-state projection`,
      metadata: { timeframe_months: timeframe, source_photo_id: sourcePhotoId },
    })

    return NextResponse.json({ success: true, future_state: insertResult.data, saved: true })
  } catch (e) {
    return NextResponse.json(
      {
        error: 'Failed to generate future state',
        details: e instanceof Error ? e.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const imageUrl = typeof body?.image_url === 'string' ? body.image_url.trim() : ''
    const timeframe = ALLOWED_TIMEFRAMES.includes(Number(body?.timeframe_months))
      ? Number(body.timeframe_months)
      : null
    const requestedId = typeof body?.id === 'string' ? body.id : null

    if (!imageUrl || timeframe == null) {
      return NextResponse.json(
        { error: 'image_url and timeframe_months are required' },
        { status: 400 }
      )
    }

    if (requestedId && !requestedId.startsWith('temp-')) {
      const { data: existing } = await supabase
        .from('fitness_future_states')
        .select('*')
        .eq('id', requestedId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ success: true, future_state: existing, already_saved: true })
      }
    }

    const { data: existingByUrl } = await supabase
      .from('fitness_future_states')
      .select('*')
      .eq('user_id', user.id)
      .eq('image_url', imageUrl)
      .maybeSingle()

    if (existingByUrl) {
      return NextResponse.json({ success: true, future_state: existingByUrl, already_saved: true })
    }

    const sourcePhotoIds = Array.isArray(body?.source_photo_ids)
      ? body.source_photo_ids.filter((id: unknown) => typeof id === 'string')
      : []

    const record: FutureStateRecord = {
      user_id: user.id,
      image_url: imageUrl,
      timeframe_months: timeframe,
      source_photo_ids: sourcePhotoIds,
      prompt: typeof body?.prompt === 'string' ? body.prompt : undefined,
    }

    const insertResult = await insertFutureStateRecord(supabase, record)
    if (insertResult.error || !insertResult.data) {
      const details = insertResult.missingTable
        ? 'Run migration 073_fitness_future_states.sql in Supabase, then try again.'
        : insertResult.error?.message || 'Could not save future state'
      return NextResponse.json({ error: 'Failed to save future state', details }, { status: 500 })
    }

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'fitness_future_state_saved',
      description: `Saved ${timeframe}-month future-state projection`,
      metadata: { timeframe_months: timeframe, future_state_id: insertResult.data.id },
    })

    return NextResponse.json({ success: true, future_state: insertResult.data })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to save future state' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

    const { data: row } = await supabase
      .from('fitness_future_states')
      .select('image_url')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    const { error } = await supabase
      .from('fitness_future_states')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete', details: error.message },
        { status: 500 }
      )
    }

    if (row?.image_url) {
      try {
        const marker = `/${BUCKET}/`
        const idx = row.image_url.indexOf(marker)
        if (idx !== -1) {
          await supabase.storage.from(BUCKET).remove([row.image_url.slice(idx + marker.length)])
        }
      } catch {
        // non-fatal
      }
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to delete future state' },
      { status: 500 }
    )
  }
}
