import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

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

    const { message, conversationHistory, appUsage, therapeuticInsights } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 })
    }

    // Create conversation context
    const conversationContext = conversationHistory
      .map((msg: any) => `${msg.role === 'user' ? 'User' : 'Therapist'}: ${msg.content}`)
      .join('\n')

    const appUsageContext = appUsage
      .map((app: any) => `${app.appName}: ${app.hours}h/day - ${app.insights}`)
      .join('\n')

    const insightsContext = therapeuticInsights
      .map((insight: any) => `${insight.type}: ${insight.description}`)
      .join('\n')

    // Generate therapeutic response with real-time suggestions
    const { text: response } = await generateText({
      model: openai('gpt-4.1-mini'),
      messages: [
        {
          role: 'system',
          content: `You are a compassionate, experienced therapist specializing in digital wellness and addiction recovery. You're having a therapeutic conversation with someone about their screen time and app usage patterns.

Your approach should be:
1. Non-judgmental and empathetic
2. Focused on understanding the emotional drivers behind app usage
3. Helpful in identifying underlying fears, insecurities, or traumas
4. Solution-oriented with practical suggestions
5. Encouraging of healthy alternatives and personal growth

The user's app usage patterns show: ${appUsageContext}

Therapeutic insights identified: ${insightsContext}

Previous conversation:
${conversationContext}

Respond as a caring therapist would, asking thoughtful follow-up questions and providing gentle guidance. Keep responses conversational and under 300 words.

After your response, analyze the conversation and provide:
1. Whether you should suggest the "Fears to Growth Goals" exercise (if user mentions fears, insecurities, or avoidance behaviors)
2. Any immediate actionable suggestions that could be added to their dashboard

Format your response as JSON:
{
  "therapeuticResponse": "Your therapeutic response here...",
  "suggestFearExercise": true/false,
  "dynamicSuggestions": [
    {
      "title": "Suggestion Title",
      "description": "Description of suggestion",
      "type": "habit/project",
      "category": "Category name",
      "points": 50,
      "target_points": 100
    }
  ]
}

Focus on suggesting HABITS (daily behaviors) and PROJECTS (multi-week challenges), not goals. Habits are daily actions that build better digital wellness.

If no dynamic suggestions are needed, return an empty array for dynamicSuggestions.`
        },
        {
          role: 'user',
          content: message
        }
      ],
      maxTokens: 800,
      temperature: 0.8,
    })

    // Parse the JSON response
    let responseData
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        responseData = JSON.parse(jsonMatch[0])
      } else {
        // Fallback if JSON parsing fails
        responseData = {
          therapeuticResponse: response,
          suggestFearExercise: false,
          dynamicSuggestions: []
        }
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      responseData = {
        therapeuticResponse: response,
        suggestFearExercise: false,
        dynamicSuggestions: []
      }
    }

    // Determine response type based on content
    let responseType = 'insight'
    if (responseData.therapeuticResponse.toLowerCase().includes('?')) {
      responseType = 'question'
    }
    if (responseData.therapeuticResponse.toLowerCase().includes('suggest') || responseData.therapeuticResponse.toLowerCase().includes('try') || responseData.therapeuticResponse.toLowerCase().includes('consider')) {
      responseType = 'suggestion'
    }

    // Store conversation in database
    const { error: insertError } = await supabase
      .from('focus_conversations')
      .insert({
        user_id: user.id,
        user_message: message,
        ai_response: responseData.therapeuticResponse,
        app_usage_context: appUsage,
        therapeutic_insights: therapeuticInsights,
        created_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Error storing conversation:', insertError)
      // Don't fail the request if we can't store it
    }

    return NextResponse.json({
      response: responseData.therapeuticResponse,
      type: responseType,
      suggestFearExercise: responseData.suggestFearExercise,
      dynamicSuggestions: responseData.dynamicSuggestions || []
    })

  } catch (error: any) {
    console.error('Error generating conversation response:', error)
    return NextResponse.json(
      { error: 'Failed to generate response', details: error.message },
      { status: 500 }
    )
  }
}
