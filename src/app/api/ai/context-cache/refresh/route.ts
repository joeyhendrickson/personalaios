/**
 * Manual refresh of AI context cache for the current user.
 * Call from dashboard refresh button or when Lifestacks Advisor opens.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { refreshUserContextCache } from '@/lib/ai-context/cache-generator'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let trigger: string | undefined
    let forceIfOlderThanMinutes: number | undefined
    try {
      const body = await req.json()
      trigger = body?.trigger
      forceIfOlderThanMinutes =
        typeof body?.forceIfOlderThanMinutes === 'number'
          ? body.forceIfOlderThanMinutes
          : trigger === 'advisor_open'
            ? 30
            : undefined
    } catch {
      // empty body is fine for manual refresh
    }

    const result = await refreshUserContextCache(user.id, {
      route: '/api/ai/context-cache/refresh',
      trigger: trigger === 'advisor_open' ? 'advisor_open' : 'manual',
      forceIfOlderThanMinutes,
    })

    if (result.skipped) {
      return NextResponse.json({
        success: true,
        skipped: true,
        skipReason: result.skipReason,
        durationMs: result.durationMs,
      })
    }

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Refresh failed',
          durationMs: result.durationMs,
        },
        { status: 422 }
      )
    }

    return NextResponse.json({
      success: true,
      durationMs: result.durationMs,
      cacheVersion: result.cacheVersion,
    })
  } catch (error) {
    console.error('[ContextCache] Manual refresh error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
