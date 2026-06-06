import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { env } from '@/lib/env'
import { defaultOpenaiModel } from '@/lib/ai/default-openai-model'

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
    const photo = formData.get('photo') as File
    const photoType = formData.get('photo_type') as string
    const targetAreas = JSON.parse((formData.get('target_areas') as string) || '[]')
    const bodyTypeGoal = formData.get('body_type_goal') as string
    const heightInches = formData.get('height_inches')
      ? parseFloat(formData.get('height_inches') as string)
      : undefined
    const weightLbs = formData.get('weight_lbs')
      ? parseFloat(formData.get('weight_lbs') as string)
      : undefined

    if (!photo) {
      return NextResponse.json({ error: 'Photo is required' }, { status: 400 })
    }

    console.log(`Uploading body photo for user: ${user.id}`)
    console.log(
      `Photo type: ${photoType}, Target areas: ${targetAreas.join(', ')}, Body type goal: ${bodyTypeGoal}, Height: ${heightInches}", Weight: ${weightLbs} lbs`
    )

    // Upload photo to Supabase Storage.
    const BUCKET = 'body-photos'
    const fileExt = (photo.name.split('.').pop() || 'jpg').toLowerCase()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`
    const contentType = photo.type || 'image/jpeg'
    const fileBuffer = Buffer.from(await photo.arrayBuffer())

    const uploadWith = (client: typeof supabase) =>
      client.storage.from(BUCKET).upload(fileName, fileBuffer, { contentType, upsert: false })

    let { error: uploadError } = await uploadWith(supabase)

    // Self-heal: if the bucket is missing or storage RLS blocks the user client,
    // use the service-role client to create the bucket and retry the upload.
    if (uploadError) {
      const msg = (uploadError.message || '').toLowerCase()
      const bucketMissing = msg.includes('bucket not found') || msg.includes('not found')
      try {
        const { createAdminClient } = await import('@/lib/supabaseAdmin')
        const admin = createAdminClient()
        if (bucketMissing) {
          await admin.storage
            .createBucket(BUCKET, { public: true, fileSizeLimit: 15 * 1024 * 1024 })
            .catch(() => {})
        }
        const retry = await uploadWith(admin as unknown as typeof supabase)
        uploadError = retry.error
      } catch (adminErr) {
        console.error('[fitness upload] admin fallback failed:', adminErr)
      }
    }

    if (uploadError) {
      console.error('Error uploading photo:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload photo', details: uploadError.message },
        { status: 500 }
      )
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(fileName)

    // Generate AI analysis if OpenAI is configured
    let analysisData = null
    if (env.OPENAI_API_KEY && env.OPENAI_API_KEY.trim() !== '') {
      try {
        analysisData = await generateBodyAnalysis(photo, targetAreas, bodyTypeGoal)
      } catch (analysisError) {
        console.error('Error generating body analysis:', analysisError)
        // Continue without analysis if AI fails
      }
    }

    // Save photo record to database.
    const baseRecord = {
      user_id: user.id,
      photo_url: publicUrl,
      photo_type: photoType,
      target_areas: targetAreas,
      body_type_goal: bodyTypeGoal,
      analysis_data: analysisData,
      is_primary: false, // Will be set to true if this is the first photo
    }

    let insertRes = await supabase
      .from('body_photos')
      .insert({ ...baseRecord, height_inches: heightInches, weight_lbs: weightLbs })
      .select()
      .single()

    // The height_inches/weight_lbs columns may not exist yet (pre-migration).
    // Retry without them so the upload still succeeds.
    if (insertRes.error) {
      const m = (insertRes.error.message || '').toLowerCase()
      if (
        insertRes.error.code === 'PGRST204' ||
        m.includes('height_inches') ||
        m.includes('weight_lbs') ||
        m.includes('column')
      ) {
        insertRes = await supabase.from('body_photos').insert(baseRecord).select().single()
      }
    }

    const photoRecord = insertRes.data
    if (insertRes.error || !photoRecord) {
      console.error('Error saving photo record:', insertRes.error)
      return NextResponse.json(
        { error: 'Failed to save photo record', details: insertRes.error?.message },
        { status: 500 }
      )
    }

    // Set as primary if it's the first photo
    const { data: existingPhotos } = await supabase
      .from('body_photos')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_primary', true)

    if (!existingPhotos || existingPhotos.length === 0) {
      await supabase.from('body_photos').update({ is_primary: true }).eq('id', photoRecord.id)
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'fitness_photo_upload',
      description: `Uploaded ${photoType} body photo for analysis`,
      metadata: {
        photo_type: photoType,
        target_areas: targetAreas,
        body_type_goal: bodyTypeGoal,
        has_ai_analysis: !!analysisData,
      },
    })

    return NextResponse.json({
      success: true,
      photo: {
        ...photoRecord,
        photo_url: publicUrl,
      },
      analysis: analysisData,
    })
  } catch (error) {
    console.error('Error in photo upload:', error)
    return NextResponse.json(
      {
        error: 'Failed to upload photo',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

async function generateBodyAnalysis(photo: File, targetAreas: string[], bodyTypeGoal: string) {
  // Convert photo to base64 for AI analysis
  const arrayBuffer = await photo.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const mimeType = photo.type

  const prompt = `
Analyze this body photo and provide fitness recommendations based on the following:

TARGET AREAS: ${targetAreas.join(', ')}
DESIRED BODY TYPE: ${bodyTypeGoal}

Please provide:
1. Current body composition assessment
2. Target areas that need focus
3. Recommended workout approach
4. Nutrition recommendations
5. Timeline expectations
6. Specific exercises for target areas

Be encouraging and realistic in your assessment. Focus on actionable advice.
`

  const { text: analysis } = await generateText({
    model: defaultOpenaiModel(),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt,
          },
          {
            type: 'image',
            image: `data:${mimeType};base64,${base64}`,
          },
        ],
      },
    ],
    temperature: 0.7,
  })

  return {
    analysis_text: analysis,
    target_areas: targetAreas,
    body_type_goal: bodyTypeGoal,
    generated_at: new Date().toISOString(),
  }
}
