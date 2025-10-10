import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

const processPhotosSchema = z.object({
  relationshipId: z.string().uuid().optional(),
  autoMatch: z.boolean().default(true),
})

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
    const { relationshipId, autoMatch } = processPhotosSchema.parse(body)

    // Get user's relationships for matching
    const { data: relationships, error: relationshipsError } = await supabase
      .from('relationships')
      .select('id, name, relationship_type')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (relationshipsError) {
      console.error('Error fetching relationships:', relationshipsError)
      return NextResponse.json({ error: 'Failed to fetch relationships' }, { status: 500 })
    }

    // Get Google Photos that need processing
    let query = supabase
      .from('relationship_photos')
      .select('*')
      .eq('user_id', user.id)
      .is('ai_tags', null) // Photos that haven't been processed yet

    if (relationshipId) {
      query = query.eq('relationship_id', relationshipId)
    }

    const { data: unprocessedPhotos, error: photosError } = await query.limit(10)

    if (photosError) {
      console.error('Error fetching unprocessed photos:', photosError)
      return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 })
    }

    if (!unprocessedPhotos || unprocessedPhotos.length === 0) {
      return NextResponse.json({
        message: 'No photos need processing',
        processed: 0,
      })
    }

    let processedCount = 0

    // Process each photo with AI
    for (const photo of unprocessedPhotos) {
      try {
        // Generate AI analysis of the photo
        const { text: aiAnalysis } = await generateText({
          model: openai('gpt-4.1-mini'),
          prompt: `Analyze this photo and provide the following information in JSON format:

PHOTO URL: ${photo.photo_url}

Please analyze the photo and return a JSON object with:
{
  "description": "Brief description of what's happening in the photo",
  "activities": ["list", "of", "activities", "or", "events"],
  "emotions": ["list", "of", "emotions", "visible"],
  "people_count": number,
  "location_type": "indoor/outdoor/restaurant/beach/etc",
  "occasion": "birthday/casual/vacation/work/etc or null",
  "suggested_people": ["list", "of", "names", "that", "might", "be", "in", "photo", "based", "on", "context"]
}

Focus on:
1. What activities are happening
2. The mood/emotion of the scene
3. Any special occasions or events
4. Potential people who might be in the photo based on context

Be specific and helpful for relationship management.`,
          temperature: 0.3,
        })

        // Parse AI response
        let analysis
        try {
          analysis = JSON.parse(aiAnalysis)
        } catch (parseError) {
          console.error('Error parsing AI analysis:', parseError)
          continue
        }

        // Auto-match people if enabled
        let matchedRelationshipId = photo.relationship_id

        if (autoMatch && !matchedRelationshipId && analysis.suggested_people?.length > 0) {
          // Find best matching relationship
          for (const suggestedName of analysis.suggested_people) {
            const matchingRelationship = relationships.find(
              (rel) =>
                rel.name.toLowerCase().includes(suggestedName.toLowerCase()) ||
                suggestedName.toLowerCase().includes(rel.name.toLowerCase())
            )

            if (matchingRelationship) {
              matchedRelationshipId = matchingRelationship.id
              break
            }
          }
        }

        // Calculate relevance score based on AI analysis
        let relevanceScore = 0.5 // Default score

        if (analysis.activities?.length > 0) relevanceScore += 0.1
        if (analysis.emotions?.length > 0) relevanceScore += 0.1
        if (analysis.people_count > 1) relevanceScore += 0.1
        if (analysis.occasion) relevanceScore += 0.1
        if (matchedRelationshipId) relevanceScore += 0.2

        relevanceScore = Math.min(relevanceScore, 1.0)

        // Update photo with AI analysis
        const { error: updateError } = await supabase
          .from('relationship_photos')
          .update({
            description: analysis.description,
            ai_tags: analysis.activities || [],
            people_in_photo: analysis.suggested_people || [],
            relevance_score: relevanceScore,
            relationship_id: matchedRelationshipId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', photo.id)

        if (updateError) {
          console.error('Error updating photo:', updateError)
          continue
        }

        processedCount++

        // Add a small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (photoError) {
        console.error(`Error processing photo ${photo.id}:`, photoError)
        continue
      }
    }

    return NextResponse.json({
      message: `Successfully processed ${processedCount} photos`,
      processed: processedCount,
      total: unprocessedPhotos.length,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    console.error('Error processing photos:', error)
    return NextResponse.json({ error: 'Failed to process photos' }, { status: 500 })
  }
}
