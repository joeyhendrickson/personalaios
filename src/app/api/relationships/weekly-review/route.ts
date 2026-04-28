import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runWeeklyRelationshipReview } from '@/lib/relationship-intel/weekly-review'

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const report = await runWeeklyRelationshipReview(supabase, user.id)
    return NextResponse.json(report)
  } catch (e) {
    console.error(e)
    const message = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
