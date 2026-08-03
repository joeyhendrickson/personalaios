import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { refreshUserContextCache } from '@/lib/ai-context/cache-generator'
import { isAdvisorRagEnabled } from '@/lib/advisor-vector/config'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: adminUser, error: adminError } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', user.email)
    .single()

  if (adminError || !adminUser || !adminUser.is_active) {
    return {
      error: NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 }),
    }
  }

  return { adminUser }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    if (!isAdvisorRagEnabled()) {
      return NextResponse.json(
        { error: 'Advisor RAG is disabled. Set PINECONE_API_KEY and PINECONE_INDEX_NAME.' },
        { status: 400 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as {
      userId?: string
      staleOnly?: boolean
      limit?: number
    }

    const admin = createAdminClient()
    const limit = Math.min(Math.max(body.limit ?? 5, 1), 20)

    let userIds: string[] = []

    if (body.userId?.trim()) {
      userIds = [body.userId.trim()]
    } else if (body.staleOnly) {
      const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const [{ data: failed }, { data: neverSynced }, { data: stale }] = await Promise.all([
        admin
          .from('user_context_cache')
          .select('user_id')
          .eq('vector_index_status', 'failed')
          .limit(limit),
        admin
          .from('user_context_cache')
          .select('user_id')
          .is('last_vector_index_at', null)
          .limit(limit),
        admin
          .from('user_context_cache')
          .select('user_id')
          .lt('last_vector_index_at', since7d)
          .limit(limit),
      ])
      userIds = [
        ...new Set(
          [...(failed ?? []), ...(neverSynced ?? []), ...(stale ?? [])].map(
            (r) => r.user_id as string
          )
        ),
      ].slice(0, limit)
    } else {
      const { data } = await admin
        .from('user_context_cache')
        .select('user_id')
        .order('last_full_refresh_at', { ascending: false, nullsFirst: false })
        .limit(limit)
      userIds = (data ?? []).map((r) => r.user_id as string)
    }

    if (userIds.length === 0) {
      return NextResponse.json({ message: 'No users matched reindex criteria', results: [] })
    }

    const results = []
    for (const userId of userIds) {
      const result = await refreshUserContextCache(userId, {
        route: '/api/admin/advisor-rag/reindex',
        trigger: 'manual',
      })
      results.push({ userId, ...result })
    }

    return NextResponse.json({
      message: `Reindexed ${results.length} user(s)`,
      results,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Reindex failed' },
      { status: 500 }
    )
  }
}
