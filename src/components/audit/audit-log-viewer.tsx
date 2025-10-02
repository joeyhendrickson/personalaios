'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { History, Search, Calendar, User, Database, ChevronDown, ChevronRight } from 'lucide-react'

interface AuditLog {
  id: string
  table_name: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  record_id: string
  old_data?: unknown
  new_data?: unknown
  metadata?: unknown
  created_at: string
}

interface AuditLogViewerProps {
  limit?: number
  showFilters?: boolean
}

export function AuditLogViewer({ limit = 50, showFilters = true }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [operationFilter, setOperationFilter] = useState<string>('all')
  const [tableFilter, setTableFilter] = useState<string>('all')
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())

  const fetchAuditLogs = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/audit-logs?limit=${limit}`)

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs')
      }

      const data = await response.json()
      setLogs(data.logs || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [limit])

  const filterLogs = useCallback(() => {
    let filtered = [...logs]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.operation.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.record_id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Operation filter
    if (operationFilter !== 'all') {
      filtered = filtered.filter((log) => log.operation === operationFilter)
    }

    // Table filter
    if (tableFilter !== 'all') {
      filtered = filtered.filter((log) => log.table_name === tableFilter)
    }

    setFilteredLogs(filtered)
  }, [logs, searchTerm, operationFilter, tableFilter])

  useEffect(() => {
    fetchAuditLogs()
  }, [fetchAuditLogs])

  useEffect(() => {
    filterLogs()
  }, [filterLogs])

  const toggleLogExpansion = (logId: string) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedLogs(newExpanded)
  }

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'INSERT':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'UPDATE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'DELETE':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTableIcon = (tableName: string) => {
    switch (tableName) {
      case 'weeks':
        return Calendar
      case 'weekly_goals':
        return User
      case 'tasks':
        return Database
      default:
        return Database
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const renderDataDiff = (oldData: unknown, newData: unknown): React.ReactNode => {
    if (!oldData && !newData) return null

    return (
      <div className="space-y-4">
        {oldData ? (
          <div>
            <h4 className="font-medium text-red-600 mb-2">Before:</h4>
            <pre className="bg-red-50 p-3 rounded text-xs overflow-x-auto">
              {JSON.stringify(oldData, null, 2)}
            </pre>
          </div>
        ) : null}
        {newData ? (
          <div>
            <h4 className="font-medium text-green-600 mb-2">After:</h4>
            <pre className="bg-green-50 p-3 rounded text-xs overflow-x-auto">
              {JSON.stringify(newData, null, 2)}
            </pre>
          </div>
        ) : null}
      </div>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="mr-2 h-5 w-5" />
            Audit Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading audit logs...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="mr-2 h-5 w-5" />
            Audit Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchAuditLogs} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <History className="mr-2 h-5 w-5" />
          Audit Logs
        </CardTitle>
        <CardDescription>
          Track all changes to your data for transparency and security.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showFilters && (
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={operationFilter} onValueChange={setOperationFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Operation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Operations</SelectItem>
                  <SelectItem value="INSERT">Insert</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Table" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tables</SelectItem>
                  <SelectItem value="weeks">Weeks</SelectItem>
                  <SelectItem value="weekly_goals">Goals</SelectItem>
                  <SelectItem value="tasks">Tasks</SelectItem>
                  <SelectItem value="points_ledger">Points</SelectItem>
                  <SelectItem value="money_ledger">Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No audit logs found matching your criteria.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedLogs.has(log.id)
              const TableIcon = getTableIcon(log.table_name)

              return (
                <div key={log.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <TableIcon className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{log.table_name}</span>
                          <Badge className={getOperationColor(log.operation)}>
                            {log.operation}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          ID: {log.record_id} • {formatTimestamp(log.created_at)}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => toggleLogExpansion(log.id)}>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t">
                      {renderDataDiff(log.old_data, log.new_data)}
                      {log.metadata ? (
                        <div className="mt-4">
                          <h4 className="font-medium text-gray-600 mb-2">Metadata:</h4>
                          <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {filteredLogs.length > 0 && (
          <div className="mt-6 text-center">
            <Button variant="outline" onClick={fetchAuditLogs}>
              Refresh Logs
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
