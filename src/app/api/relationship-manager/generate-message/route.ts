import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { buildRelationshipContextBundle } from '@/lib/relationship-manager/context-bundle'

const legacyContext = z.enum(['casual_check_in', 'birthday', 'holiday', 'follow_up', 'thank_you'])

const bodySchema = z.object({
  relationshipId: z.string().uuid(),
  context: legacyContext.optional(),
  mode: z.enum(['single', 'framework']).optional().default('single'),
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
    const { relationshipId, context = 'casual_check_in', mode } = bodySchema.parse(body)

    const { data: relationship, error: relationshipError } = await supabase
      .from('relationships')
      .select('*')
      .eq('id', relationshipId)
      .eq('user_id', user.id)
      .single()

    if (relationshipError || !relationship) {
      return NextResponse.json({ error: 'Relationship not found' }, { status: 404 })
    }

    const bundle = await buildRelationshipContextBundle(supabase, user.id, relationshipId)

    if (mode === 'framework') {
      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: `You draft outbound messages for ${relationship.name} (${relationship.relationship_type}).

FULL CONTEXT:
${bundle.profileText}

PHOTOS / MEMORIES (tags & descriptions):
${bundle.photoContext}

DOCUMENTS:
${bundle.documentContext}

TEXT THREADS (summaries):
${bundle.screenshotContext}

TIMELINE NOTES:
${bundle.notesContext}

RECENT LOGGED CONTACTS:
${bundle.contactContext}

Return ONLY valid JSON:
{
  "social_invites": [{"label": "short label", "message": "2-5 sentences, warm, specific"}],
  "check_ins": [{"label": "", "message": ""}],
  "share_article_or_news": [{"label": "", "message": "", "suggested_topic": "what to look up or share"}],
  "strategy_questions": [{"label": "", "message": ""}]
}

Rules:
- social_invites: 2 options — concrete plans (coffee, walk, event) using their interests when known.
- check_ins: 2 options — funny or distinctive, not generic "hope you're well".
- share_article_or_news: 2 options — tie to their interests or joint work; message proposes sharing without inventing a specific fake article title.
- strategy_questions: 2 options — genuine asks related to user's goals and their expertise/role; mutual value.
- Tone fits relationship_type; keep each message under 120 words.`,
        temperature: 0.85,
      })

      let framework: Record<string, unknown> = {}
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) framework = JSON.parse(jsonMatch[0]) as Record<string, unknown>
      } catch {
        framework = { parse_error: true, raw: text }
      }

      return NextResponse.json({
        mode: 'framework',
        framework,
        relationshipName: relationship.name,
      })
    }

    const contextPrompts: Record<string, string> = {
      casual_check_in: `Write a warm, casual message to check in and see how they're doing`,
      birthday: `Write a heartfelt birthday message with personal touches`,
      holiday: `Write a warm holiday greeting message`,
      follow_up: `Write a follow-up message based on your last interaction`,
      thank_you: `Write a sincere thank you message`,
    }

    const prompt = `You are helping me write a personal message to ${relationship.name}, who is a ${relationship.relationship_type}.

RELATIONSHIP CONTEXT:
${bundle.profileText}

PHOTOS / TAGS:
${bundle.photoContext}

DOCUMENTS (summaries):
${bundle.documentContext}

MESSAGE THREAD CONTEXT:
${bundle.screenshotContext}

NOTES:
${bundle.notesContext}

RECENT CONTACTS LOGGED:
${bundle.contactContext}

TASK: ${contextPrompts[context]}

REQUIREMENTS:
1. Keep it personal and authentic - sound like a real person, not a bot
2. Reference shared memories, documents, or thread themes only when supported above — do not invent facts
3. Match the relationship type in tone
4. Keep it concise but meaningful (2-5 sentences)
5. Include a question or call-to-action to encourage response
6. Don't be overly formal or generic

Generate a natural, personalized message:`

    const { text: message } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.8,
    })

    return NextResponse.json({
      mode: 'single',
      message: message.trim(),
      context: {
        relationshipName: relationship.name,
        relationshipType: relationship.relationship_type,
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
