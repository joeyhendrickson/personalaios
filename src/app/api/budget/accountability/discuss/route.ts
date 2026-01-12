import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { env } from '@/lib/env'

export async function POST(request: NextRequest) {
  try {
    if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY.trim() === '') {
      return NextResponse.json(
        {
          error: 'OpenAI API key not configured',
          details: 'Please add OPENAI_API_KEY to your environment variables',
        },
        { status: 500 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { questionId, message, conversationHistory = [] } = body

    if (!questionId || !message) {
      return NextResponse.json({ error: 'questionId and message are required' }, { status: 400 })
    }

    // Fetch the accountability question
    const { data: question, error: questionError } = await supabase
      .from('accountability_questions')
      .select('*')
      .eq('id', questionId)
      .eq('user_id', user.id)
      .single()

    if (questionError || !question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // Fetch existing discussion history
    const { data: existingDiscussions } = await supabase
      .from('accountability_question_discussions')
      .select('*')
      .eq('accountability_question_id', questionId)
      .order('created_at', { ascending: true })

    // Build conversation history
    const fullHistory = [
      ...(existingDiscussions?.map((d: any) => ({
        role: d.role,
        content: d.message,
      })) || []),
      ...conversationHistory,
      { role: 'user' as const, content: message },
    ]

    // Create context for the AI
    const transactionsContext = question.transactions
      ? `\n\nTransaction Details:\n${JSON.stringify(question.transactions, null, 2)}`
      : ''

    const prompt = `You are a helpful financial advisor discussing an accountability question with a user about their spending habits.

Accountability Question: ${question.question}
Category: ${question.category}
Context: ${question.context || 'No additional context'}${transactionsContext}

The user is engaging in a discussion about this question. Provide a helpful, supportive, and constructive response that:
1. Acknowledges their message
2. Provides relevant insights or suggestions
3. Helps them understand their spending patterns
4. Encourages positive financial behaviors

Keep your response conversational and supportive. If they're explaining or justifying spending, help them think through whether it aligns with their goals.

Previous conversation:
${fullHistory
  .slice(0, -1)
  .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
  .join('\n')}

User's current message: ${message}

Provide your response:`

    // Generate AI response
    const { text: aiResponse } = await generateText({
      model: openai('gpt-4.1-mini'),
      messages: [
        {
          role: 'system',
          content:
            'You are a supportive financial advisor helping users understand and improve their spending habits. Be empathetic, constructive, and goal-oriented.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    })

    // Store both user message and AI response
    const { error: insertError } = await supabase
      .from('accountability_question_discussions')
      .insert([
        {
          accountability_question_id: questionId,
          user_id: user.id,
          role: 'user',
          message: message,
        },
        {
          accountability_question_id: questionId,
          user_id: user.id,
          role: 'assistant',
          message: aiResponse,
        },
      ])

    if (insertError) {
      console.error('Error storing discussion:', insertError)
      // Continue even if storage fails
    }

    // Update question status to in_discussion if it's still pending
    if (question.status === 'pending') {
      await supabase
        .from('accountability_questions')
        .update({ status: 'in_discussion', updated_at: new Date().toISOString() })
        .eq('id', questionId)
    }

    return NextResponse.json({
      success: true,
      response: aiResponse,
    })
  } catch (error) {
    console.error('Error in accountability discussion:', error)
    return NextResponse.json(
      {
        error: 'Failed to process discussion',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
