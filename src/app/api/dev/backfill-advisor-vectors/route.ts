/**
 * Backfill advisor vectors (cache refresh + Pinecone sync).
 * Auth: Bearer CRON_SECRET (same as cron jobs).
 * POST { "limit": 20 }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { refreshUserContextCache } from '@/lib/ai-context/cache-generator'
import { getPineconeIndexStats, pingPinecone } from '@/lib/advisor-vector/client'
import { getAdvisorRagConfigSummary, isAdvisorRagEnabled } from '@/lib/advisor-vector/config'

function verifyRequest(request: NextRequest): boolean {
  const host = request.headers.get('host') ?? ''
  if (host.startsWith('localhost:') || host.startsWith('127.0.0.1:')) {
    return true
  }

  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) return false
  return authHeader === `Bearer ${cronSecret}`
}

export async function POST(request: NextRequest) {
  if (!verifyRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAdvisorRagEnabled()) {
    return NextResponse.json(
      { error: 'Advisor RAG disabled. Set PINECONE_API_KEY in .env.local' },
      { status: 400 }
    )
  }

  const ping = await pingPinecone()
  if (!ping.ok) {
    return NextResponse.json({ error: `Pinecone unreachable: ${ping.error}` }, { status: 502 })
  }

  const body = (await request.json().catch(() => ({}))) as { limit?: number }
  const limit = Math.min(Math.max(body.limit ?? 20, 1), 50)

  const supabase = createAdminClient()
  const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({ perPage: limit })
  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500 })
  }

  const users = listData?.users ?? []
  const results: Array<{
    userId: string
    email: string | undefined
    cacheSuccess: boolean
    vectorStatus?: string
    chunks?: number
    error?: string
    ms: number
  }> = []

  for (const user of users) {
    const r = await refreshUserContextCache(user.id, {
      route: '/api/dev/backfill-advisor-vectors',
      trigger: 'manual',
    })

    const { data: row } = await supabase
      .from('user_context_cache')
      .select('vector_chunk_count, vector_index_status, vector_index_error')
      .eq('user_id', user.id)
      .single()

    results.push({
      userId: user.id,
      email: user.email,
      cacheSuccess: r.success,
      vectorStatus: (row as { vector_index_status?: string } | null)?.vector_index_status,
      chunks: (row as { vector_chunk_count?: number } | null)?.vector_chunk_count,
      error:
        r.error ??
        (row as { vector_index_error?: string | null } | null)?.vector_index_error ??
        undefined,
      ms: r.durationMs,
    })
  }

  const stats = await getPineconeIndexStats()
  const namespaces = stats?.namespaces ?? {}

  return NextResponse.json({
    config: getAdvisorRagConfigSummary(),
    processed: results.length,
    vectorSuccess: results.filter((r) => r.vectorStatus === 'success').length,
    totalChunks: results.reduce((s, r) => s + (r.chunks ?? 0), 0),
    pinecone: {
      totalVectors: stats?.totalVectorCount ?? 0,
      namespaceCount: Object.keys(namespaces).length,
      namespaces: Object.entries(namespaces)
        .slice(0, 20)
        .map(([id, info]) => ({
          namespace: id,
          vectors: info.recordCount ?? 0,
        })),
    },
    results,
  })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
