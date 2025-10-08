import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        status: 'error',
        message: 'Not authenticated',
        authError: authError?.message,
      })
    }

    // Check if OpenAI key is configured
    const hasOpenAI = !!process.env.OPENAI_API_KEY

    // Check if table exists
    const { error: tableError } = await supabase.from('grocery_analyses').select('id').limit(1)

    return NextResponse.json({
      status: 'ok',
      user: user.email,
      openai: hasOpenAI ? 'configured' : 'missing',
      database: tableError ? `error: ${tableError.message}` : 'ok',
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
