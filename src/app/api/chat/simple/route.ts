import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    console.log('Simple chat API called with messages:', messages.length)

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Simple chat auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Simple chat user authenticated:', user.id)

    // Get basic user data
    const { data: goals } = await supabase
      .from('weekly_goals')
      .select('*')
      .eq('user_id', user.id)
      .limit(3)

    const { data: tasks } = await supabase.from('tasks').select('*').eq('user_id', user.id).limit(3)

    const userContext = {
      goalsCount: goals?.length || 0,
      tasksCount: tasks?.length || 0,
      sampleGoals: goals?.slice(0, 2) || [],
    }

    console.log('User context:', userContext)

    // Simple AI call without streaming
    const { text } = await generateText({
      model: openai('gpt-4.1-mini'),
      messages: [
        {
          role: 'system',
          content: `You are a helpful productivity assistant. The user has ${userContext.goalsCount} goals and ${userContext.tasksCount} tasks. Be friendly and helpful.`,
        },
        ...messages,
      ],
    })

    console.log('AI response generated:', text.length, 'characters')

    return NextResponse.json({
      message: text,
      userContext,
    })
  } catch (error) {
    console.error('Simple chat error:', error)
    return NextResponse.json(
      {
        error: 'Chat failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
