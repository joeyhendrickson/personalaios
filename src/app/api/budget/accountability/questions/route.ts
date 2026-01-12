import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch accountability questions with their discussions
    const { data: questions, error: questionsError } = await supabase
      .from('accountability_questions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (questionsError) {
      console.error('Error fetching questions:', questionsError)
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
    }

    // Fetch discussions for each question
    const questionsWithDiscussions = await Promise.all(
      (questions || []).map(async (question) => {
        const { data: discussions } = await supabase
          .from('accountability_question_discussions')
          .select('*')
          .eq('accountability_question_id', question.id)
          .order('created_at', { ascending: true })

        return {
          ...question,
          discussions: discussions || [],
        }
      })
    )

    return NextResponse.json({
      success: true,
      questions: questionsWithDiscussions,
    })
  } catch (error) {
    console.error('Error in GET /api/budget/accountability/questions:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch questions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
