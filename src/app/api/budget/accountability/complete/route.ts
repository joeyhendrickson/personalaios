import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    const { questionId } = body

    if (!questionId) {
      return NextResponse.json({ error: 'questionId is required' }, { status: 400 })
    }

    // Update the question status to completed
    const { error: updateError } = await supabase
      .from('accountability_questions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', questionId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error completing question:', updateError)
      return NextResponse.json({ error: 'Failed to complete question' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Question marked as completed',
    })
  } catch (error) {
    console.error('Error completing accountability question:', error)
    return NextResponse.json(
      {
        error: 'Failed to complete question',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
