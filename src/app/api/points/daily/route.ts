import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { groupEarnedPointsByDay } from '@/lib/fitness/energy-growth-chart'

function isIsoDate(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/** GET /api/points/daily — earned points totals by UTC day. */
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

    const fromParam = request.nextUrl.searchParams.get('from')
    const toParam = request.nextUrl.searchParams.get('to')
    const today = new Date().toISOString().slice(0, 10)
    const from = isIsoDate(fromParam) ? fromParam : today
    const to = isIsoDate(toParam) && toParam >= from ? toParam : today

    const { data, error } = await supabase
      .from('points_ledger')
      .select('points, created_at')
      .eq('user_id', user.id)
      .gt('points', 0)
      .gte('created_at', `${from}T00:00:00.000Z`)
      .lte('created_at', `${to}T23:59:59.999Z`)
      .order('created_at', { ascending: true })
      .limit(20000)

    if (error) {
      console.error('Error fetching daily points:', error)
      return NextResponse.json({ error: 'Failed to fetch daily points' }, { status: 500 })
    }

    return NextResponse.json({
      from,
      to,
      days: groupEarnedPointsByDay(data || []),
    })
  } catch (error) {
    console.error('GET /api/points/daily:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch daily points',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
