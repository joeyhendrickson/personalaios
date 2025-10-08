import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

const generateMessageSchema = z.object({
  relationshipId: z.string().uuid(),
  context: z.enum(['casual_check_in', 'birthday', 'holiday', 'follow_up', 'thank_you']).optional(),
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
    const { relationshipId, context = 'casual_check_in' } = generateMessageSchema.parse(body)

    // Get relationship details
    const { data: relationship, error: relationshipError } = await supabase
      .from('relationships')
      .select('*')
      .eq('id', relationshipId)
      .eq('user_id', user.id)
      .single()

    if (relationshipError || !relationship) {
      return NextResponse.json({ error: 'Relationship not found' }, { status: 404 })
    }

    // Get recent photos with this person for context
    const { data: photos } = await supabase
      .from('relationship_photos')
      .select('description, ai_tags, photo_date, location')
      .eq('relationship_id', relationshipId)
      .eq('user_id', user.id)
      .order('photo_date', { ascending: false })
      .limit(5)

    // Get recent contact history
    const { data: contactHistory } = await supabase
      .from('contact_history')
      .select('contact_type, outcome, created_at')
      .eq('relationship_id', relationshipId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3)

    // Build context for AI
    const photoContext =
      photos && photos.length > 0
        ? `Recent photos together: ${photos
            .map(
              (p: any) =>
                `${p.description || 'Photo'} from ${p.photo_date} at ${p.location || 'unknown location'}. Activities: ${p.ai_tags?.join(', ') || 'general'}`
            )
            .join('; ')}`
        : 'No recent photos available'

    const contactContext =
      contactHistory && contactHistory.length > 0
        ? `Recent contacts: ${contactHistory
            .map(
              (c: any) =>
                `${c.contact_type} on ${new Date(c.created_at).toLocaleDateString()}: ${c.outcome || 'no specific outcome'}`
            )
            .join('; ')}`
        : 'No recent contact history'

    const contextPrompts = {
      casual_check_in: `Write a warm, casual message to check in and see how they're doing`,
      birthday: `Write a heartfelt birthday message with personal touches`,
      holiday: `Write a warm holiday greeting message`,
      follow_up: `Write a follow-up message based on your last interaction`,
      thank_you: `Write a sincere thank you message`,
    }

    const prompt = `You are helping me write a personal message to ${relationship.name}, who is a ${relationship.relationship_type}.

RELATIONSHIP CONTEXT:
- Name: ${relationship.name}
- Relationship Type: ${relationship.relationship_type}
- Priority Level: ${relationship.priority_level}/5
- Last Contact: ${relationship.last_contact_date || 'Never'}
- Contact Frequency: Every ${relationship.contact_frequency_days} days
- Notes: ${relationship.notes || 'No additional notes'}

${photoContext}

${contactContext}

TASK: ${contextPrompts[context]}

REQUIREMENTS:
1. Keep it personal and authentic - sound like a real person, not a bot
2. Reference shared memories or experiences if available from the photo context
3. Match the relationship type and priority level in tone (family/friends = warm, business = professional)
4. Keep it concise but meaningful (2-4 sentences)
5. Include a question or call-to-action to encourage response
6. Don't be overly formal or generic

Generate a natural, personalized message:`

    const { text: message } = await generateText({
      model: openai('gpt-4.1-mini'),
      prompt,
      temperature: 0.8,
    })

    return NextResponse.json({
      message: message.trim(),
      context: {
        relationshipName: relationship.name,
        relationshipType: relationship.relationship_type,
        photosUsed: photos?.length || 0,
        contactHistoryUsed: contactHistory?.length || 0,
      },
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

    console.error('Error generating message:', error)
    return NextResponse.json({ error: 'Failed to generate message' }, { status: 500 })
  }
}
