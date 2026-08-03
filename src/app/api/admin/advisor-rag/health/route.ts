import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { getAdvisorRagConfigSummary, isAdvisorRagEnabled } from '@/lib/advisor-vector/config'
import { getPineconeIndexStats, pingPinecone } from '@/lib/advisor-vector/client'

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

export async function GET() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const config = getAdvisorRagConfigSummary()
    const ping = config.enabled ? await pingPinecone() : { ok: false, error: 'RAG disabled' }
    const stats = config.enabled ? await getPineconeIndexStats() : null

    const admin = createAdminClient()
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [
      { count: indexedUsers },
      { count: staleUsers },
      { count: failedUsers },
      { count: zeroVectorUsers },
      { data: recentEvents },
      { data: retrieveEvents },
    ] = await Promise.all([
      admin
        .from('user_context_cache')
        .select('*', { count: 'exact', head: true })
        .eq('vector_index_status', 'success'),
      admin
        .from('user_context_cache')
        .select('*', { count: 'exact', head: true })
        .eq('vector_index_status', 'success')
        .lt('last_vector_index_at', since24h),
      admin
        .from('user_context_cache')
        .select('*', { count: 'exact', head: true })
        .eq('vector_index_status', 'failed'),
      admin
        .from('user_context_cache')
        .select('*', { count: 'exact', head: true })
        .or('vector_chunk_count.eq.0,vector_index_status.eq.idle'),
      admin
        .from('advisor_rag_events')
        .select('event_type, status, chunks_upserted, chunks_deleted, chunks_retrieved, created_at')
        .gte('created_at', since24h)
        .order('created_at', { ascending: false })
        .limit(100),
      admin
        .from('advisor_rag_events')
        .select('chunks_retrieved')
        .eq('event_type', 'retrieve')
        .eq('status', 'success')
        .gte('created_at', since24h),
    ])

    const syncEvents = (recentEvents ?? []).filter((e) => e.event_type === 'sync')
    const chunksUpserted24h = syncEvents.reduce((s, e) => s + (e.chunks_upserted ?? 0), 0)
    const chunksDeleted24h = syncEvents.reduce((s, e) => s + (e.chunks_deleted ?? 0), 0)
    const retrieveCount24h = retrieveEvents?.length ?? 0
    const avgRetrieved =
      retrieveCount24h > 0
        ? Math.round(
            (retrieveEvents ?? []).reduce((s, e) => s + (e.chunks_retrieved ?? 0), 0) /
              retrieveCount24h
          )
        : 0

    const namespaceCount = stats?.namespaces ? Object.keys(stats.namespaces).length : 0

    const warnings: string[] = []
    if (!config.enabled) warnings.push('Advisor RAG is disabled or Pinecone is not configured.')
    if (config.enabled && !ping.ok) warnings.push(`Pinecone connection failed: ${ping.error}`)
    if ((failedUsers ?? 0) > 0) warnings.push(`${failedUsers} user(s) have failed vector sync.`)
    if ((staleUsers ?? 0) > 0)
      warnings.push(`${staleUsers} user(s) have vector indexes older than 24 hours.`)
    if ((zeroVectorUsers ?? 0) > 0)
      warnings.push(`${zeroVectorUsers} user(s) have no indexed vectors yet.`)

    let health: 'healthy' | 'degraded' | 'down' = 'healthy'
    if (!config.enabled || !ping.ok) health = 'down'
    else if (warnings.length > 0) health = 'degraded'

    const { data: userRows } = await admin
      .from('user_context_cache')
      .select(
        'user_id, vector_index_status, last_vector_index_at, vector_chunk_count, vector_index_error'
      )
      .order('last_vector_index_at', { ascending: false, nullsFirst: false })
      .limit(25)

    return NextResponse.json({
      health,
      config,
      pinecone: {
        connected: ping.ok,
        error: ping.error,
        totalVectors: stats?.totalVectorCount ?? 0,
        namespaceCount,
      },
      users: {
        indexed: indexedUsers ?? 0,
        stale: staleUsers ?? 0,
        failed: failedUsers ?? 0,
        zeroVectors: zeroVectorUsers ?? 0,
      },
      analytics24h: {
        syncJobs: syncEvents.length,
        chunksUpserted: chunksUpserted24h,
        chunksDeleted: chunksDeleted24h,
        retrieveQueries: retrieveCount24h,
        avgChunksRetrieved: avgRetrieved,
      },
      warnings,
      recentUsers: userRows ?? [],
      ragActiveInChat: isAdvisorRagEnabled(),
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Health check failed' },
      { status: 500 }
    )
  }
}
