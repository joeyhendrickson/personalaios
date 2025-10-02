import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    console.log('Testing priorities table access for user:', user.id)

    // Test 1: Try to select from priorities table
    const { data: priorities, error: selectError } = await supabase
      .from('priorities')
      .select('*')
      .eq('user_id', user.id)

    if (selectError) {
      console.error('Error selecting from priorities:', selectError)
      return NextResponse.json(
        {
          error: 'Failed to select from priorities table',
          details: selectError.message,
          code: selectError.code,
        },
        { status: 500 }
      )
    }

    // Test 2: Try to insert a test priority
    const { data: insertData, error: insertError } = await supabase
      .from('priorities')
      .insert({
        user_id: user.id,
        title: 'Test Priority',
        description: 'This is a test priority',
        priority_type: 'manual',
        priority_score: 50,
        is_completed: false,
        order_index: 1,
      })
      .select()

    if (insertError) {
      console.error('Error inserting into priorities:', insertError)
      return NextResponse.json(
        {
          error: 'Failed to insert into priorities table',
          details: insertError.message,
          code: insertError.code,
        },
        { status: 500 }
      )
    }

    // Test 3: Clean up the test priority
    if (insertData && insertData.length > 0) {
      await supabase.from('priorities').delete().eq('id', insertData[0].id)
    }

    return NextResponse.json({
      message: 'Priorities table is accessible',
      existing_priorities: priorities?.length || 0,
      test_insert: 'SUCCESS',
    })
  } catch (error) {
    console.error('Unexpected error testing priorities:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
