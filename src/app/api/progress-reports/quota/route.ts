import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProgressReportQuota } from '@/lib/progress-reports/quota'

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

    const quota = await getProgressReportQuota(user.id, user.email, {
      userMetadata: user.user_metadata,
    })
    return NextResponse.json({ quota })
  } catch (error) {
    console.error('[progress-reports/quota]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
