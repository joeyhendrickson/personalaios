'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Receipt } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

type UsageSummary = {
  totalCostUsd: number
  totalInputTokens: number
  totalCachedInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  totalCalls: number
  failedCalls: number
  averageLatencyMs: number | null
  cacheSavingsEstimateUsd?: number | null
  summaryTruncated?: boolean
}

type LogRow = {
  id: string
  created_at: string
  module: string
  action: string
  route: string | null
  model: string
  input_tokens: number | null
  cached_input_tokens: number | null
  output_tokens: number | null
  total_tokens: number | null
  estimated_cost_usd: number | null
  status: string
  latency_ms: number | null
  description: string | null
}

function fmtUsd(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—'
  return `$${n.toFixed(4)}`
}

function fmtNum(n: number | null | undefined) {
  if (n == null) return '—'
  return n.toLocaleString()
}

export default function AiUsageReceiptPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogRow[]>([])
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [count, setCount] = useState(0)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [module, setModule] = useState('')
  const [model, setModel] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [offset, setOffset] = useState(0)
  const limit = 40

  const queryString = useMemo(() => {
    const p = new URLSearchParams()
    if (startDate) p.set('startDate', startDate)
    if (endDate) p.set('endDate', endDate)
    if (module.trim()) p.set('module', module.trim())
    if (model.trim()) p.set('model', model.trim())
    if (status !== 'all') p.set('status', status)
    p.set('limit', String(limit))
    p.set('offset', String(offset))
    return p.toString()
  }, [startDate, endDate, module, model, status, offset])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/ai-usage/my?${queryString}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setLogs(data.logs || [])
      setSummary(data.summary || null)
      setCount(typeof data.count === 'number' ? data.count : 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [queryString])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Receipt className="h-8 w-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI usage receipt</h1>
              <p className="text-sm text-gray-600">
                Transparency for AI work performed on your account. Estimates only; actual billing
                may differ.
              </p>
            </div>
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Estimated AI cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-gray-900">
                  {fmtUsd(summary.totalCostUsd)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  AI work performed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-gray-900">{summary.totalCalls}</p>
                <p className="text-xs text-gray-500 mt-1">Calls in this period</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Tokens used</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-gray-900">
                  {fmtNum(summary.totalTokens)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Cached tokens</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-gray-900">
                  {fmtNum(summary.totalCachedInputTokens)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Failed calls</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-gray-900">{summary.failedCalls}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Average latency</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-gray-900">
                  {summary.averageLatencyMs != null ? `${summary.averageLatencyMs} ms` : '—'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {summary?.summaryTruncated && (
          <p className="text-sm text-amber-700 mb-4">
            Summary reflects the most recent records up to a cap; totals may be slightly below full
            history for very heavy usage.
          </p>
        )}

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="start">Start date</Label>
              <Input
                id="start"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setOffset(0)
                  setStartDate(e.target.value)
                }}
              />
            </div>
            <div>
              <Label htmlFor="end">End date</Label>
              <Input
                id="end"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setOffset(0)
                  setEndDate(e.target.value)
                }}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => {
                  setOffset(0)
                  setStatus(v)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="mod">Module</Label>
              <Input
                id="mod"
                placeholder="e.g. chat"
                value={module}
                onChange={(e) => {
                  setOffset(0)
                  setModule(e.target.value)
                }}
              />
            </div>
            <div>
              <Label htmlFor="mdl">Model</Label>
              <Input
                id="mdl"
                placeholder="e.g. gpt-5-mini"
                value={model}
                onChange={(e) => {
                  setOffset(0)
                  setModel(e.target.value)
                }}
              />
            </div>
            <div className="flex items-end">
              <Button type="button" onClick={() => void load()} className="w-full">
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Receipt</CardTitle>
            {loading && <Loader2 className="h-5 w-5 animate-spin text-gray-400" />}
          </CardHeader>
          <CardContent className="space-y-4">
            {logs.length === 0 && !loading ? (
              <p className="text-gray-500 text-center py-8">No AI activity in this range yet.</p>
            ) : (
              logs.map((row) => (
                <div
                  key={row.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-gray-500">
                        {new Date(row.created_at).toLocaleString()}
                      </p>
                      <p className="font-medium text-gray-900">
                        {row.module} · {row.action}
                      </p>
                    </div>
                    <Badge variant={row.status === 'failed' ? 'destructive' : 'secondary'}>
                      {row.status}
                    </Badge>
                  </div>
                  {row.description && <p className="text-sm text-gray-700">{row.description}</p>}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm text-gray-600">
                    <div>
                      <span className="text-gray-500">Model used</span>
                      <p className="font-mono text-xs">{row.model}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Tokens used</span>
                      <p>{fmtNum(row.total_tokens)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Cached tokens</span>
                      <p>{fmtNum(row.cached_input_tokens)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Input / output</span>
                      <p>
                        {fmtNum(row.input_tokens)} / {fmtNum(row.output_tokens)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Estimated cost</span>
                      <p>{fmtUsd(row.estimated_cost_usd)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Latency</span>
                      <p>{row.latency_ms != null ? `${row.latency_ms} ms` : '—'}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div className="flex justify-between items-center pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0 || loading}
                onClick={() => setOffset((o) => Math.max(0, o - limit))}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                Showing {logs.length ? offset + 1 : 0}–{offset + logs.length} of {count}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={loading || offset + limit >= count}
                onClick={() => setOffset((o) => o + limit)}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
