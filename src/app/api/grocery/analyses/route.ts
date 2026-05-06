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

    const { data, error } = await supabase
      .from('grocery_analyses')
      .select('id, zip_code, total_spending, total_savings, recommended_store, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching grocery analyses:', error)
      return NextResponse.json({ error: 'Failed to fetch analyses' }, { status: 500 })
    }

    return NextResponse.json({ analyses: data || [] }, { status: 200 })
  } catch (error) {
    console.error('Error in grocery analyses GET:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch analyses',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

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
    const zipCode = String(body.zipCode || body.zip_code || '').trim()
    const analysisData = body.analysisData || body.analysis_data

    if (!zipCode || !/^\d{5}$/.test(zipCode)) {
      return NextResponse.json({ error: 'zipCode (5 digits) is required' }, { status: 400 })
    }

    if (!analysisData || typeof analysisData !== 'object') {
      return NextResponse.json({ error: 'analysisData is required' }, { status: 400 })
    }

    const totalSpending = Number(
      body.totalSpending ?? body.total_spending ?? analysisData.totalCurrentSpending ?? 0
    )
    const totalSavings = Number(
      body.totalSavings ?? body.total_savings ?? analysisData.totalPotentialSavings ?? 0
    )
    const recommendedStore = String(
      body.recommendedStore ??
        body.recommended_store ??
        analysisData.storeRecommendation?.storeName ??
        ''
    ).trim()

    const { data: row, error } = await supabase
      .from('grocery_analyses')
      .insert({
        user_id: user.id,
        zip_code: zipCode,
        total_spending: Number.isFinite(totalSpending) ? totalSpending : 0,
        total_savings: Number.isFinite(totalSavings) ? totalSavings : 0,
        recommended_store: recommendedStore || null,
        analysis_data: analysisData,
      })
      .select('id, created_at')
      .single()

    if (error) {
      console.error('Error saving grocery analysis:', error)
      return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 })
    }

    return NextResponse.json({ success: true, analysis: row }, { status: 201 })
  } catch (error) {
    console.error('Error in grocery analyses POST:', error)
    return NextResponse.json(
      {
        error: 'Failed to save analysis',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
