import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const contactId = searchParams.get('contactId')

    let query = supabase
      .from('ai_suggestions')
      .select(
        `
        *,
        contacts (
          id,
          name,
          relationship_types (
            name
          )
        )
      `
      )
      .eq('user_id', user.id)
      .eq('is_completed', false)
      .order('priority_score', { ascending: false })

    if (contactId) {
      query = query.eq('contact_id', contactId)
    }

    const { data: suggestions, error } = await query

    if (error) {
      console.error('Error fetching AI suggestions:', error)
      return NextResponse.json({ error: 'Failed to fetch AI suggestions' }, { status: 500 })
    }

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Error in AI suggestions API:', error)
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

    const body = await request.json()
    const { contactId, userZipcode, dailyPriorities } = body

    // Fetch contact and relationship data
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select(
        `
        *,
        relationship_types (
          name,
          description
        ),
        contact_profiles (
          profile_data
        ),
        interactions (
          interaction_type,
          interaction_date,
          notes,
          outcome
        )
      `
      )
      .eq('id', contactId)
      .eq('user_id', user.id)
      .single()

    if (contactError || !contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Generate AI suggestions based on relationship type and context
    const relationshipType = contact.relationship_types.name
    const profileData = contact.contact_profiles?.[0]?.profile_data || {}
    const recentInteractions = contact.interactions || []

    const prompt = `You are a relationship management AI assistant. Generate personalized suggestions for maintaining and strengthening relationships.

CONTACT INFORMATION:
- Name: ${contact.name}
- Relationship Type: ${relationshipType}
- Last Contact: ${contact.last_contact_date || 'Never'}
- Preferred Frequency: Every ${contact.preferred_contact_frequency_days} days
- Engagement Score: ${contact.engagement_score}/100
- Location: ${contact.zipcode || 'Not specified'}
- User Location: ${userZipcode || 'Not specified'}

PROFILE DATA:
${JSON.stringify(profileData, null, 2)}

RECENT INTERACTIONS:
${recentInteractions.map((i: any) => `- ${i.interaction_type} on ${i.interaction_date}: ${i.notes || 'No notes'}`).join('\n')}

USER'S DAILY PRIORITIES:
${dailyPriorities || 'Not specified'}

RELATIONSHIP TYPE CONTEXT:
${getRelationshipTypeContext(relationshipType)}

Generate 3-5 specific, actionable suggestions for this relationship. Consider:
1. Appropriate communication methods for this relationship type
2. Timing and frequency based on their preferences
3. Personalized content based on their profile and interests
4. Location-based activities if both locations are known
5. Current engagement level and how to improve it

Return your response as a JSON array of suggestions, each with:
- type: "message", "activity", "follow_up", or "event"
- content: The specific suggestion
- priority_score: 1-100 based on urgency and importance
- reasoning: Why this suggestion is relevant

Example format:
[
  {
    "type": "message",
    "content": "Send a thoughtful text about their recent project milestone",
    "priority_score": 85,
    "reasoning": "High engagement opportunity based on their recent success"
  }
]`

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
    })

    let suggestions
    try {
      suggestions = JSON.parse(text)
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      suggestions = [
        {
          type: 'message',
          content: 'Consider reaching out to maintain your connection',
          priority_score: 50,
          reasoning: 'General relationship maintenance',
        },
      ]
    }

    // Save suggestions to database
    const suggestionInserts = suggestions.map((suggestion: any) => ({
      user_id: user.id,
      contact_id: contactId,
      suggestion_type: suggestion.type,
      suggestion_content: suggestion.content,
      priority_score: suggestion.priority_score,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    }))

    const { data: savedSuggestions, error: saveError } = await supabase
      .from('ai_suggestions')
      .insert(suggestionInserts)
      .select()

    if (saveError) {
      console.error('Error saving suggestions:', saveError)
      return NextResponse.json({ error: 'Failed to save suggestions' }, { status: 500 })
    }

    return NextResponse.json({ suggestions: savedSuggestions })
  } catch (error) {
    console.error('Error in generate AI suggestions API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getRelationshipTypeContext(relationshipType: string): string {
  const contexts = {
    'Family (Close Cultural)':
      'Focus on emotional support, health updates, cultural events, prayer requests, and maintaining close family bonds. Consider cultural traditions and family dynamics.',
    'Potential Investors (Fundraising)':
      'Focus on business opportunities, project updates, networking events, and building professional relationships. Consider their investment interests and business goals.',
    'Potential Clients (Sales)':
      'Focus on business needs, solution offerings, and building trust. Consider their pain points and how your services can help them.',
    'Friendships (Social)':
      'Focus on shared interests, social activities, and personal connections. Consider their hobbies, interests, and social preferences.',
    'Dating (Romantic)':
      'Focus on romantic connection, shared experiences, and building intimacy. Consider their interests, love language, and relationship goals.',
  }

  return (
    contexts[relationshipType as keyof typeof contexts] ||
    'Focus on maintaining a positive relationship and finding ways to add value to their life.'
  )
}
