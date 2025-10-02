import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all analyses for the user
    const { data, error } = await supabase
      .from('trading_analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error loading analyses:', error)
      return NextResponse.json({ error: 'Failed to load analyses' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      analyses: data || [],
    })
  } catch (error) {
    console.error('Error in load-analyses API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const analysisId = searchParams.get('id')

    if (!analysisId) {
      return NextResponse.json({ error: 'Analysis ID is required' }, { status: 400 })
    }

    // Delete the analysis
    const { error } = await supabase
      .from('trading_analyses')
      .delete()
      .eq('id', analysisId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting analysis:', error)
      return NextResponse.json({ error: 'Failed to delete analysis' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Analysis deleted successfully',
    })
  } catch (error) {
    console.error('Error in delete-analysis API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
