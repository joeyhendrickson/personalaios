import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { defaultOpenaiModel } from '@/lib/ai/default-openai-model'
import { resolveOpenAIModelId } from '@/lib/ai/openai-model-id'
import { logAfterVercelSdkCall } from '@/lib/ai/usage-logger'

export async function POST(req: Request) {
  const requestStart = Date.now()
  let logUserId: string | null = null
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
    logUserId = user.id

    // Get basic user data
    const { data: dashboardProjects } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .limit(3)

    const { data: tasks } = await supabase.from('tasks').select('*').eq('user_id', user.id).limit(3)

    const userContext = {
      projectsCount: dashboardProjects?.length || 0,
      tasksCount: tasks?.length || 0,
      sampleProjects: dashboardProjects?.slice(0, 2) || [],
    }

    console.log('User context:', userContext)

    const startMs = Date.now()
    const modelId = resolveOpenAIModelId()
    const result = await generateText({
      model: defaultOpenaiModel(),
      messages: [
        {
          role: 'system',
          content: `You are a helpful productivity assistant. The user has ${userContext.projectsCount} dashboard projects (not the same as long-term Goals in the Goals feature) and ${userContext.tasksCount} tasks. Be friendly and helpful.`,
        },
        ...messages,
      ],
    })

    await logAfterVercelSdkCall({
      startMs,
      userId: user.id,
      module: 'chat',
      action: 'generate_simple_chat_response',
      route: '/api/chat/simple',
      model: modelId,
      description: 'Generated a short chat reply using basic dashboard counts.',
      result,
    })

    console.log('AI response generated:', result.text.length, 'characters')

    return NextResponse.json({
      message: result.text,
      userContext,
    })
  } catch (error) {
    console.error('Simple chat error:', error)
    if (logUserId) {
      await logAfterVercelSdkCall({
        startMs: requestStart,
        userId: logUserId,
        module: 'chat',
        action: 'generate_simple_chat_response',
        route: '/api/chat/simple',
        model: resolveOpenAIModelId(),
        description: 'Generated a short chat reply using basic dashboard counts.',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
    return NextResponse.json(
      {
        error: 'Chat failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
