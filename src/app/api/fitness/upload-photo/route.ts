import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { env } from '@/lib/env'

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

    // Upload photo to Supabase Storage
    const fileExt = photo.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('body-photos')
      .upload(fileName, photo)

    if (uploadError) {
      console.error('Error uploading photo:', uploadError)
      return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 })
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('body-photos').getPublicUrl(fileName)

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

    // Save photo record to database
    const { data: photoRecord, error: dbError } = await supabase
      .from('body_photos')
      .insert({
        user_id: user.id,
        photo_url: publicUrl,
        photo_type: photoType,
        height_inches: heightInches,
        weight_lbs: weightLbs,
        target_areas: targetAreas,
        body_type_goal: bodyTypeGoal,
        analysis_data: analysisData,
        is_primary: false, // Will be set to true if this is the first photo
      })
      .select()
      .single()

    if (dbError) {
      console.error('Error saving photo record:', dbError)
      return NextResponse.json({ error: 'Failed to save photo record' }, { status: 500 })
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
    model: openai('gpt-4.1-mini'),
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
