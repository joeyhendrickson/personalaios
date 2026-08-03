'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, Database, AlertTriangle, RefreshCw } from 'lucide-react'

type HealthResponse = {
  health: 'healthy' | 'degraded' | 'down'
  config: {
    enabled: boolean
    indexName: string
    hasApiKey: boolean
    hasOpenAiKey: boolean
  }
  pinecone: {
    connected: boolean
    error?: string
    totalVectors: number
    namespaceCount: number
  }
  users: {
    indexed: number
    stale: number
    failed: number
    zeroVectors: number
  }
  analytics24h: {
    syncJobs: number
    chunksUpserted: number
    chunksDeleted: number
    retrieveQueries: number
    avgChunksRetrieved: number
  }
  warnings: string[]
  ragActiveInChat: boolean
  recentUsers: Array<{
    user_id: string
    vector_index_status: string
    last_vector_index_at: string | null
    vector_chunk_count: number
    vector_index_error: string | null
  }>
}

function healthBadge(health: HealthResponse['health']) {
  if (health === 'healthy') return <Badge className="bg-emerald-600">Healthy</Badge>
  if (health === 'degraded') return <Badge className="bg-amber-600">Degraded</Badge>
  return <Badge variant="destructive">Down</Badge>
}

export function AdvisorRagAdminPanel() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [reindexing, setReindexing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<HealthResponse | null>(null)
  const [userId, setUserId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/advisor-rag/health', { credentials: 'same-origin' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load RAG health')
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const reindex = async (opts: { userId?: string; staleOnly?: boolean }) => {
    setReindexing(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/advisor-rag/reindex', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: opts.userId,
          staleOnly: opts.staleOnly,
          limit: 5,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Reindex failed')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reindex failed')
    } finally {
      setReindexing(false)
    }
  }

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="h-5 w-5" />
          Advisor Memory (RAG / Pinecone)
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? 'Hide' : 'Show'}
        </Button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Refresh status
            </Button>
            <Button
              size="sm"
              onClick={() => void reindex({ staleOnly: true })}
              disabled={reindexing}
            >
              {reindexing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Reindex stale (5 users)
            </Button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="User UUID to reindex"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={!userId.trim() || reindexing}
              onClick={() => void reindex({ userId: userId.trim() })}
            >
              Reindex user
            </Button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {data && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                {healthBadge(data.health)}
                <span className="text-sm text-gray-600">
                  RAG in chat: {data.ragActiveInChat ? 'ON' : 'OFF'}
                </span>
                <span className="text-sm text-gray-600">Index: {data.config.indexName}</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-gray-500">Pinecone</div>
                  <div className="font-medium">
                    {data.pinecone.connected ? 'Connected' : 'Failed'}
                  </div>
                  <div className="text-xs text-gray-600">
                    {data.pinecone.totalVectors} vectors · {data.pinecone.namespaceCount} namespaces
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-gray-500">Users indexed</div>
                  <div className="font-medium">{data.users.indexed}</div>
                  <div className="text-xs text-gray-600">
                    {data.users.stale} stale · {data.users.failed} failed
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-gray-500">24h sync</div>
                  <div className="font-medium">{data.analytics24h.syncJobs} jobs</div>
                  <div className="text-xs text-gray-600">
                    +{data.analytics24h.chunksUpserted} / -{data.analytics24h.chunksDeleted} chunks
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-gray-500">24h retrieval</div>
                  <div className="font-medium">{data.analytics24h.retrieveQueries} queries</div>
                  <div className="text-xs text-gray-600">
                    avg {data.analytics24h.avgChunksRetrieved} chunks
                  </div>
                </div>
              </div>

              {data.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                  <div className="mb-1 flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    Warnings
                  </div>
                  <ul className="list-disc space-y-1 pl-5">
                    {data.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {data.recentUsers.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="py-2 pr-4">User</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Chunks</th>
                        <th className="py-2 pr-4">Last sync</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentUsers.map((row) => (
                        <tr key={row.user_id} className="border-b border-gray-100">
                          <td className="py-2 pr-4 font-mono text-xs">
                            {row.user_id.slice(0, 8)}…
                          </td>
                          <td className="py-2 pr-4">{row.vector_index_status}</td>
                          <td className="py-2 pr-4">{row.vector_chunk_count}</td>
                          <td className="py-2 pr-4 text-xs text-gray-600">
                            {row.last_vector_index_at
                              ? new Date(row.last_vector_index_at).toLocaleString()
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}
