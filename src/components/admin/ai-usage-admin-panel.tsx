'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { Loader2, Sparkles } from 'lucide-react'

type Summary = {
  totalCostUsd: number
  totalTokens: number
  totalCalls: number
  failedCalls: number
  averageLatencyMs: number | null
  cacheSavingsEstimateUsd?: number | null
  costByModule: Record<string, number>
  costByModel: Record<string, number>
  costByRoute: Record<string, number>
  costByAction: Record<string, number>
  costByUser?: Record<string, number>
  mostExpensiveUserId?: string | null
  mostExpensiveUserCostUsd?: number | null
  mostExpensiveModule?: string | null
  mostExpensiveModuleCostUsd?: number | null
  summaryTruncated?: boolean
}

type LogRow = {
  id: string
  created_at: string
  user_id: string | null
  module: string
  action: string
  route: string | null
  model: string
  estimated_cost_usd: number | null
  status: string
  latency_ms: number | null
  description: string | null
}

function fmtUsd(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—'
  return `$${n.toFixed(4)}`
}

function topEntries(map: Record<string, number>, n = 8) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
}

export function AiUsageAdminPanel() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [count, setCount] = useState(0)
  const [userId, setUserId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [module, setModule] = useState('')
  const [action, setAction] = useState('')
  const [model, setModel] = useState('')
  const [status, setStatus] = useState('all')
  const [offset, setOffset] = useState(0)
  const limit = 50

  const queryString = useMemo(() => {
    const p = new URLSearchParams()
    if (userId.trim()) p.set('userId', userId.trim())
    if (startDate) p.set('startDate', startDate)
    if (endDate) p.set('endDate', endDate)
    if (module.trim()) p.set('module', module.trim())
    if (action.trim()) p.set('action', action.trim())
    if (model.trim()) p.set('model', model.trim())
    if (status !== 'all') p.set('status', status)
    p.set('limit', String(limit))
    p.set('offset', String(offset))
    return p.toString()
  }, [userId, startDate, endDate, module, action, model, status, offset])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/ai-usage?${queryString}`)
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
    if (open) void load()
  }, [open, load])

  const failedRecent = useMemo(() => logs.filter((l) => l.status === 'failed').slice(0, 15), [logs])

  const expensiveRecent = useMemo(
    () =>
      [...logs]
        .filter((l) => (l.estimated_cost_usd ?? 0) > 0)
        .sort((a, b) => (b.estimated_cost_usd ?? 0) - (a.estimated_cost_usd ?? 0))
        .slice(0, 15),
    [logs]
  )

  if (!open) {
    return (
      <Card className="mb-8">
        <CardContent className="py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-violet-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI usage &amp; cost</h2>
              <p className="text-sm text-gray-600">
                Tokens, estimated spend, failures, and breakdowns across users and modules.
              </p>
            </div>
          </div>
          <Button type="button" onClick={() => setOpen(true)}>
            Open panel
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-600" />
          AI usage &amp; cost
        </CardTitle>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
            Refresh
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Collapse
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {summary?.summaryTruncated && (
          <p className="text-sm text-amber-700">
            Summary aggregates cap at a large row limit; totals may be slightly low for very heavy
            tenants.
          </p>
        )}

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Stat label="Total AI cost" value={fmtUsd(summary.totalCostUsd)} />
            <Stat label="Total tokens" value={summary.totalTokens.toLocaleString()} />
            <Stat label="Total calls" value={String(summary.totalCalls)} />
            <Stat label="Failed calls" value={String(summary.failedCalls)} />
            <Stat
              label="Avg latency"
              value={summary.averageLatencyMs != null ? `${summary.averageLatencyMs} ms` : '—'}
            />
            <Stat
              label="Cache savings (est.)"
              value={fmtUsd(summary.cacheSavingsEstimateUsd ?? null)}
            />
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg border p-4 bg-white">
              <p className="font-medium text-gray-900 mb-1">Most expensive module</p>
              <p className="text-gray-700">
                {summary.mostExpensiveModule || '—'}{' '}
                <span className="text-gray-500">
                  ({fmtUsd(summary.mostExpensiveModuleCostUsd ?? null)})
                </span>
              </p>
            </div>
            <div className="rounded-lg border p-4 bg-white">
              <p className="font-medium text-gray-900 mb-1">Most expensive user</p>
              <p className="text-gray-700 font-mono text-xs break-all">
                {summary.mostExpensiveUserId || '—'}
              </p>
              <p className="text-gray-500">{fmtUsd(summary.mostExpensiveUserCostUsd ?? null)}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="User ID">
            <Input
              placeholder="Filter by user uuid"
              value={userId}
              onChange={(e) => {
                setOffset(0)
                setUserId(e.target.value)
              }}
            />
          </Field>
          <Field label="Start date">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setOffset(0)
                setStartDate(e.target.value)
              }}
            />
          </Field>
          <Field label="End date">
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setOffset(0)
                setEndDate(e.target.value)
              }}
            />
          </Field>
          <Field label="Status">
            <Select
              value={status}
              onValueChange={(v) => {
                setOffset(0)
                setStatus(v)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Module">
            <Input
              value={module}
              onChange={(e) => {
                setOffset(0)
                setModule(e.target.value)
              }}
            />
          </Field>
          <Field label="Action">
            <Input
              value={action}
              onChange={(e) => {
                setOffset(0)
                setAction(e.target.value)
              }}
            />
          </Field>
          <Field label="Model">
            <Input
              value={model}
              onChange={(e) => {
                setOffset(0)
                setModel(e.target.value)
              }}
            />
          </Field>
          <div className="flex items-end">
            <Button type="button" className="w-full" onClick={() => void load()}>
              Apply filters
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BreakdownTable
              title="Usage by user (est. cost)"
              rows={topEntries(summary.costByUser || {}, 12)}
            />
            <BreakdownTable title="Usage by module" rows={topEntries(summary.costByModule)} />
            <BreakdownTable title="Usage by model" rows={topEntries(summary.costByModel)} />
            <BreakdownTable title="Usage by route" rows={topEntries(summary.costByRoute)} />
            <BreakdownTable title="Usage by action" rows={topEntries(summary.costByAction)} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Failed AI calls</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {failedRecent.length === 0 ? (
                <p className="text-sm text-gray-500">None on this page.</p>
              ) : (
                failedRecent.map((row) => (
                  <div key={row.id} className="text-xs border rounded p-2 bg-red-50/50">
                    <div className="flex justify-between gap-2">
                      <span className="font-mono text-[11px] break-all">{row.user_id}</span>
                      <Badge variant="destructive">failed</Badge>
                    </div>
                    <p className="text-gray-700 mt-1">
                      {row.module} · {row.action}
                    </p>
                    <p className="text-gray-500">{row.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Recent expensive requests</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {expensiveRecent.length === 0 ? (
                <p className="text-sm text-gray-500">None on this page.</p>
              ) : (
                expensiveRecent.map((row) => (
                  <div key={row.id} className="text-xs border rounded p-2 bg-white">
                    <div className="flex justify-between">
                      <span>{fmtUsd(row.estimated_cost_usd)}</span>
                      <span className="text-gray-500">
                        {new Date(row.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700 mt-1">
                      {row.module} · {row.action}
                    </p>
                    <p className="text-gray-500 font-mono truncate">{row.route}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Recent logs</h3>
          <div className="overflow-x-auto border rounded-md">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-2">When</th>
                  <th className="p-2">User</th>
                  <th className="p-2">Module</th>
                  <th className="p-2">Action</th>
                  <th className="p-2">Cost</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="p-2 whitespace-nowrap text-xs">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="p-2 font-mono text-[10px] max-w-[120px] truncate">
                      {row.user_id || '—'}
                    </td>
                    <td className="p-2">{row.module}</td>
                    <td className="p-2">{row.action}</td>
                    <td className="p-2">{fmtUsd(row.estimated_cost_usd)}</td>
                    <td className="p-2">
                      <Badge variant={row.status === 'failed' ? 'destructive' : 'secondary'}>
                        {row.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between mt-3">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0 || loading}
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
            >
              Previous
            </Button>
            <span className="text-xs text-gray-500 self-center">
              {offset + 1}–{offset + logs.length} of {count}
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
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-gray-600">{label}</Label>
      {children}
    </div>
  )
}

function BreakdownTable({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <table className="w-full text-sm border rounded-md overflow-hidden">
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="p-2 text-gray-500">No data</td>
            </tr>
          ) : (
            rows.map(([k, v]) => (
              <tr key={k} className="border-t">
                <td className="p-2 text-gray-800 break-all">{k}</td>
                <td className="p-2 text-right font-mono">{fmtUsd(v)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
