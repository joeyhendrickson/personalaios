'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useAdminAuth } from '@/hooks/use-admin-auth'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Upload,
  DollarSign,
  Trash2,
  RefreshCw,
  ImageIcon,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  FileText,
} from 'lucide-react'

interface BillingEntry {
  id: string
  provider: string
  charge_date: string
  description: string
  amount: number
  currency: string
  billing_period: string | null
  source_type: string
  screenshot_url: string | null
  raw_parsed_data: any
  notes: string | null
  created_at: string
}

interface MonthlySummary {
  [month: string]: {
    total: number
    byProvider: Record<string, number>
  }
}

const PROVIDERS = [
  { id: 'plaid', label: 'Plaid', color: 'bg-blue-100 text-blue-800' },
  { id: 'openai', label: 'OpenAI', color: 'bg-green-100 text-green-800' },
  { id: 'vercel', label: 'Vercel', color: 'bg-gray-100 text-gray-800' },
  { id: 'supabase', label: 'Supabase', color: 'bg-emerald-100 text-emerald-800' },
  { id: 'other', label: 'Other', color: 'bg-yellow-100 text-yellow-800' },
]

function getProviderBadge(provider: string) {
  const p = PROVIDERS.find((pr) => pr.id === provider)
  return <Badge className={p?.color || 'bg-gray-100 text-gray-800'}>{p?.label || provider}</Badge>
}

export default function AdminBillingPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdminAuth()

  const [entries, setEntries] = useState<BillingEntry[]>([])
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary>({})
  const [loading, setLoading] = useState(true)

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadProvider, setUploadProvider] = useState('plaid')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [filterProvider, setFilterProvider] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterProvider) params.set('provider', filterProvider)

      const res = await fetch(`/api/admin/platform-billing?${params}`)
      if (!res.ok) throw new Error('Failed to fetch billing data')

      const data = await res.json()
      setEntries(data.entries || [])
      setMonthlySummary(data.monthlySummary || {})
    } catch (err) {
      console.error('Failed to load billing data:', err)
    } finally {
      setLoading(false)
    }
  }, [filterProvider])

  useEffect(() => {
    if (!userLoading && !adminLoading) {
      if (!user) {
        router.push('/login')
        return
      }
      if (!isAdmin) {
        router.push('/dashboard')
        return
      }
      fetchEntries()
    }
  }, [user, isAdmin, userLoading, adminLoading, router, fetchEntries])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadFile(file)
    setUploadResult(null)
    setUploadError(null)

    const reader = new FileReader()
    reader.onload = () => setUploadPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!uploadFile) return
    setUploading(true)
    setUploadError(null)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('screenshot', uploadFile)
      formData.append('provider', uploadProvider)

      const res = await fetch('/api/admin/platform-billing', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        setUploadError(data.error || `Upload failed (${res.status})`)
        if (data.raw_response) setUploadResult({ raw_response: data.raw_response })
        return
      }

      setUploadResult(data)
      setUploadFile(null)
      setUploadPreview(null)
      fetchEntries()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this billing entry?')) return
    try {
      const res = await fetch(`/api/admin/platform-billing?id=${id}`, { method: 'DELETE' })
      if (res.ok) fetchEntries()
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  if (userLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const totalAllTime = entries.reduce((sum, e) => sum + (parseFloat(String(e.amount)) || 0), 0)
  const sortedMonths = Object.keys(monthlySummary).sort().reverse()
  const currentMonth = new Date().toISOString().substring(0, 7)
  const currentMonthTotal = monthlySummary[currentMonth]?.total || 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button onClick={() => router.push('/admin')} variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Admin Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Platform Costs</h1>
                <p className="text-sm text-gray-600">
                  Upload billing screenshots to track running costs
                </p>
              </div>
            </div>
            <Button onClick={fetchEntries} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Cost Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">${currentMonthTotal.toFixed(2)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">All-Time Total</p>
                <p className="text-2xl font-bold text-gray-900">${totalAllTime.toFixed(2)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Entries</p>
                <p className="text-2xl font-bold text-gray-900">{entries.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Billing Screenshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                <select
                  value={uploadProvider}
                  onChange={(e) => setUploadProvider(e.target.value)}
                  className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Screenshot</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <Button
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
                className="min-w-[140px]"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Parse & Save
                  </>
                )}
              </Button>
            </div>

            {/* Preview */}
            {uploadPreview && (
              <div className="mt-4 border rounded-lg p-2 bg-gray-50 max-w-lg">
                <img
                  src={uploadPreview}
                  alt="Screenshot preview"
                  className="rounded max-h-64 object-contain mx-auto"
                />
              </div>
            )}

            {/* Upload Error */}
            {uploadError && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 text-red-700 text-sm">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Error</p>
                  <p>{uploadError}</p>
                </div>
              </div>
            )}

            {/* Upload Success */}
            {uploadResult?.success && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-green-50 text-green-700 text-sm">
                <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">
                    Parsed {uploadResult.entries_created} entries from screenshot
                  </p>
                  {uploadResult.parsed?.confidence && (
                    <p>Confidence: {uploadResult.parsed.confidence}</p>
                  )}
                  {uploadResult.parsed?.notes && <p>{uploadResult.parsed.notes}</p>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Breakdown */}
        {sortedMonths.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Monthly Cost Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sortedMonths.map((month) => {
                  const data = monthlySummary[month]
                  const label = new Date(month + '-01').toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                  })
                  return (
                    <div
                      key={month}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{label}</p>
                        <div className="flex gap-2 mt-1">
                          {Object.entries(data.byProvider).map(([prov, amt]) => (
                            <span key={prov} className="text-xs text-gray-500">
                              {PROVIDERS.find((p) => p.id === prov)?.label || prov}: $
                              {(amt as number).toFixed(2)}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-lg font-bold text-gray-900">${data.total.toFixed(2)}</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Entries Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Billing Entries
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={filterProvider === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterProvider(null)}
                >
                  All
                </Button>
                {PROVIDERS.filter((p) => p.id !== 'other').map((p) => (
                  <Button
                    key={p.id}
                    variant={filterProvider === p.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterProvider(filterProvider === p.id ? null : p.id)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-500">Loading billing data...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No billing entries yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Upload a billing screenshot above to get started
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Provider
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Period
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                          {new Date(entry.charge_date + 'T00:00:00').toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3 text-sm">{getProviderBadge(entry.provider)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                          {entry.description}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {entry.billing_period || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 whitespace-nowrap">
                          ${parseFloat(String(entry.amount)).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {entry.screenshot_url && (
                              <a
                                href={entry.screenshot_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-gray-400 hover:text-blue-600"
                                title="View screenshot"
                              >
                                <ImageIcon className="h-4 w-4" />
                              </a>
                            )}
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="Delete entry"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
