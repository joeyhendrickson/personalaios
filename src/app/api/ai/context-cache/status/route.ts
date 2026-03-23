/**
 * Returns AI context cache status for the current user.
 * Useful for debugging and admin inspection.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabaseAdmin'

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

    const admin = createAdminClient()
    const { data: cache, error } = await admin
      .from('user_context_cache')
      .select(
        'id, cache_version, last_full_refresh_at, last_incremental_refresh_at, refresh_status, refresh_error, updated_at'
      )
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const hasCache = !!cache
    const lastRefresh = cache?.last_full_refresh_at
    const ageHours = lastRefresh
      ? (Date.now() - new Date(lastRefresh).getTime()) / (1000 * 60 * 60)
      : null

    return NextResponse.json({
      hasCache,
      cacheVersion: cache?.cache_version,
      lastFullRefreshAt: cache?.last_full_refresh_at,
      lastIncrementalRefreshAt: cache?.last_incremental_refresh_at,
      refreshStatus: cache?.refresh_status,
      refreshError: cache?.refresh_error,
      cacheAgeHours: ageHours != null ? Math.round(ageHours * 10) / 10 : null,
      isStale: ageHours != null && ageHours > 24,
    })
  } catch (error) {
    console.error('[ContextCache] Status error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
