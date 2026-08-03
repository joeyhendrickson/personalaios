/**
 * Backfill advisor vectors for all users (or a limit).
 * Usage: npx tsx scripts/backfill-advisor-vectors.ts [--limit=20]
 */
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'
import { refreshUserContextCache } from '../src/lib/ai-context/cache-generator'
import { getPineconeIndexStats, pingPinecone } from '../src/lib/advisor-vector/client'
import { getAdvisorRagConfigSummary, isAdvisorRagEnabled } from '../src/lib/advisor-vector/config'

function loadEnvLocal() {
  const path = join(process.cwd(), '.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

async function main() {
  loadEnvLocal()

  const limitArg = process.argv.find((a) => a.startsWith('--limit='))
  const limit = limitArg ? Math.min(parseInt(limitArg.split('=')[1], 10) || 20, 100) : 20

  const config = getAdvisorRagConfigSummary()
  console.log('Advisor RAG config:', config)

  if (!isAdvisorRagEnabled()) {
    console.error('RAG disabled — set PINECONE_API_KEY and PINECONE_INDEX_NAME in .env.local')
    process.exit(1)
  }

  const ping = await pingPinecone()
  if (!ping.ok) {
    console.error('Pinecone ping failed:', ping.error)
    console.error(
      'Ensure index "' + config.indexName + '" exists in Pinecone console (1536 dims, cosine).'
    )
    process.exit(1)
  }
  console.log('Pinecone: connected')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({ perPage: limit })
  if (listErr) {
    console.error('Failed to list users:', listErr.message)
    process.exit(1)
  }

  const users = listData?.users ?? []
  console.log(`Vectorizing ${users.length} user(s)...\n`)

  const results: Array<{
    email: string
    userId: string
    cacheOk: boolean
    chunks?: number
    vectorStatus?: string
    error?: string
    ms: number
  }> = []

  for (const user of users) {
    const start = Date.now()
    process.stdout.write(`  ${user.email ?? user.id} ... `)

    const r = await refreshUserContextCache(user.id, {
      route: '/scripts/backfill-advisor-vectors',
      trigger: 'manual',
    })

    const { data: cacheRow } = await supabase
      .from('user_context_cache')
      .select('vector_chunk_count, vector_index_status, vector_index_error, last_vector_index_at')
      .eq('user_id', user.id)
      .single()

    const row = cacheRow as {
      vector_chunk_count?: number
      vector_index_status?: string
      vector_index_error?: string
      last_vector_index_at?: string
    } | null

    results.push({
      email: user.email ?? '(no email)',
      userId: user.id,
      cacheOk: r.success,
      chunks: row?.vector_chunk_count,
      vectorStatus: row?.vector_index_status,
      error: r.error ?? row?.vector_index_error ?? undefined,
      ms: Date.now() - start,
    })

    const status = row?.vector_index_status ?? 'unknown'
    const chunks = row?.vector_chunk_count ?? 0
    console.log(`${status} · ${chunks} chunks · ${Date.now() - start}ms`)
    if (row?.vector_index_error) console.log(`    error: ${row.vector_index_error}`)
  }

  const stats = await getPineconeIndexStats()
  console.log('\n--- Summary ---')
  console.log(`Users processed: ${results.length}`)
  console.log(`Vector sync success: ${results.filter((r) => r.vectorStatus === 'success').length}`)
  console.log(`Total chunks indexed: ${results.reduce((s, r) => s + (r.chunks ?? 0), 0)}`)
  console.log(`Pinecone total vectors: ${stats?.totalVectorCount ?? '?'}`)
  console.log(
    `Pinecone namespaces: ${stats?.namespaces ? Object.keys(stats.namespaces).length : '?'}`
  )

  if (stats?.namespaces) {
    console.log('\nNamespaces (user_id → vector count):')
    for (const [ns, info] of Object.entries(stats.namespaces).slice(0, 15)) {
      console.log(`  ${ns.slice(0, 8)}… → ${info.recordCount ?? 0} vectors`)
    }
    if (Object.keys(stats.namespaces).length > 15) {
      console.log(`  … and ${Object.keys(stats.namespaces).length - 15} more`)
    }
  }

  console.log('\nCheck Pinecone console → index → lifestacks-advisor → Namespaces')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
