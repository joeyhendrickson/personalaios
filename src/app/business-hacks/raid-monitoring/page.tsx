'use client'

import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Settings,
  Play,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Filter,
  Edit,
  Eye,
  Flame,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface UserCredentials {
  google_connected: boolean
  pinecone_configured: boolean
  openai_configured: boolean
}

interface RAIDAnalysisJob {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  client_name: string
  project_name: string
  summary?: RAIDSummary
  created_at: string
}

interface RAIDSummary {
  risks_count: number
  assumptions_count: number
  issues_count: number
  dependencies_count: number
  fires_detected: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
}

interface RAIDEntry {
  id: string
  type: 'Risk' | 'Assumption' | 'Issue' | 'Dependency'
  title: string
  description: string
  impact: number
  likelihood: number
  urgency: number
  confidence: number
  priority_score: number
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  blocker: boolean
  owner?: string
  due_date?: string
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed'
  is_fire: boolean
  fire_reason?: string
  fire_status?: 'Unacknowledged' | 'Acknowledged' | 'Mitigating' | 'Contained' | 'Resolved'
  sources: Array<{
    doc_title: string
    doc_date: string
    excerpt: string
  }>
  version: number
  created_at: string
  updated_at: string
}

interface FireEvent {
  id: string
  raid_id: string
  triggered_at: string
  trigger_rule: string
  priority_score: number
  severity: string
  next_actions: string[]
  status: 'Unacknowledged' | 'Acknowledged' | 'Mitigating' | 'Contained' | 'Resolved'
  raid_entry?: RAIDEntry
}

export default function RAIDMonitoringPage() {
  const [activeTab, setActiveTab] = useState('analyze')
  const [credentials, setCredentials] = useState<UserCredentials>({
    google_connected: false,
    pinecone_configured: false,
    openai_configured: false,
  })
  const [analysisJobs, setAnalysisJobs] = useState<RAIDAnalysisJob[]>([])
  const [raidEntries, setRAIDEntries] = useState<RAIDEntry[]>([])
  const [fireEvents, setFireEvents] = useState<FireEvent[]>([])
  const [loading, setLoading] = useState(false)

  // Form states
  const [driveFolderUrl, setDriveFolderUrl] = useState('')
  const [clientName, setClientName] = useState('')
  const [projectName, setProjectName] = useState('')

  // Filter states
  const [filterType, setFilterType] = useState<string>('all')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    fetchCredentials()
    fetchAnalysisJobs()
    fetchRAIDEntries()
    fetchFireEvents()
  }, [])

  const fetchCredentials = async () => {
    try {
      const response = await fetch('/api/project-plan-builder/credentials')
      if (response.ok) {
        const data = await response.json()
        setCredentials(data.credentials)
      }
    } catch (error) {
      console.error('Error fetching credentials:', error)
    }
  }

  const fetchAnalysisJobs = async () => {
    try {
      const response = await fetch('/api/raid-monitoring/jobs')
      if (response.ok) {
        const data = await response.json()
        setAnalysisJobs(data.jobs || [])
      }
    } catch (error) {
      console.error('Error fetching analysis jobs:', error)
    }
  }

  const fetchRAIDEntries = async () => {
    try {
      const response = await fetch('/api/raid-monitoring/entries')
      if (response.ok) {
        const data = await response.json()
        setRAIDEntries(data.entries || [])
      }
    } catch (error) {
      console.error('Error fetching RAID entries:', error)
    }
  }

  const fetchFireEvents = async () => {
    try {
      const response = await fetch('/api/raid-monitoring/fires')
      if (response.ok) {
        const data = await response.json()
        setFireEvents(data.fires || [])
      }
    } catch (error) {
      console.error('Error fetching fire events:', error)
    }
  }

  const handleStartAnalysis = async () => {
    if (!driveFolderUrl || !clientName || !projectName) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/raid-monitoring/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drive_folder_url: driveFolderUrl,
          client_name: clientName,
          project_name: projectName,
        }),
      })

      if (response.ok) {
        await fetchAnalysisJobs()
        setDriveFolderUrl('')
        setClientName('')
        setProjectName('')
      }
    } catch (error) {
      console.error('Error starting analysis:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAcknowledgeFire = async (fireId: string) => {
    try {
      const response = await fetch(`/api/raid-monitoring/fires/${fireId}/acknowledge`, {
        method: 'POST',
      })

      if (response.ok) {
        await fetchFireEvents()
        await fetchRAIDEntries()
      }
    } catch (error) {
      console.error('Error acknowledging fire:', error)
    }
  }

  const handleExportRAID = async () => {
    try {
      const response = await fetch('/api/raid-monitoring/export')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `raid-log-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting RAID log:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getSeverityBadge = (severity: string) => {
    const variants = {
      Low: 'secondary',
      Medium: 'default',
      High: 'destructive',
      Critical: 'destructive',
    } as const

    const colors = {
      Low: 'text-gray-600',
      Medium: 'text-yellow-600',
      High: 'text-orange-600',
      Critical: 'text-red-600',
    }

    return (
      <Badge
        variant={variants[severity as keyof typeof variants] || 'secondary'}
        className={colors[severity as keyof typeof colors]}
      >
        {severity}
      </Badge>
    )
  }

  const filteredRAIDEntries = raidEntries.filter((entry) => {
    if (filterType !== 'all' && entry.type !== filterType) return false
    if (filterSeverity !== 'all' && entry.severity !== filterSeverity) return false
    if (filterStatus !== 'all' && entry.status !== filterStatus) return false
    return true
  })

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Link href="/business-hacks">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Business Hacks
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center">
                <AlertTriangle className="h-8 w-8 mr-3 text-red-600" />
                RAID Monitoring Tool
              </h1>
              <p className="text-gray-600">
                Continuous monitoring and fire detection for project risks, assumptions, issues, and
                dependencies
              </p>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="analyze">Analyze RAID</TabsTrigger>
          <TabsTrigger value="board">RAID Board</TabsTrigger>
          <TabsTrigger value="fires">
            Fires ({fireEvents.filter((f) => f.status !== 'Resolved').length})
          </TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Analyze RAID Tab */}
        <TabsContent value="analyze" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Start New Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Start New RAID Analysis</CardTitle>
                <CardDescription>
                  Analyze Google Drive documents to extract and monitor RAID items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="drive-folder">Google Drive Folder URL</Label>
                    <Input
                      id="drive-folder"
                      placeholder="https://drive.google.com/drive/folders/..."
                      value={driveFolderUrl}
                      onChange={(e) => setDriveFolderUrl(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="client-name">Client Name</Label>
                    <Input
                      id="client-name"
                      placeholder="Enter client name"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="project-name">Project Name</Label>
                    <Input
                      id="project-name"
                      placeholder="Enter project name"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleStartAnalysis}
                    disabled={loading || !driveFolderUrl || !clientName || !projectName}
                    className="w-full"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Analyze RAID
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Analysis Jobs */}
            <Card>
              <CardHeader>
                <CardTitle>Analysis Jobs</CardTitle>
                <CardDescription>Track the progress of your RAID analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysisJobs.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No analysis jobs yet</p>
                  ) : (
                    analysisJobs.map((job) => (
                      <div key={job.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">
                              {job.client_name} - {job.project_name}
                            </h4>
                            <p className="text-sm text-gray-500">
                              Started {new Date(job.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(job.status)}
                            <span className="text-sm font-medium capitalize">{job.status}</span>
                          </div>
                        </div>

                        {job.status === 'running' && (
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Progress</span>
                              <span>{job.progress}%</span>
                            </div>
                            <Progress value={job.progress} className="h-2" />
                          </div>
                        )}

                        {job.status === 'completed' && job.summary && (
                          <div className="space-y-3">
                            <div>
                              <h5 className="font-medium mb-2">RAID Summary</h5>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>Risks: {job.summary.risks_count}</div>
                                <div>Assumptions: {job.summary.assumptions_count}</div>
                                <div>Issues: {job.summary.issues_count}</div>
                                <div>Dependencies: {job.summary.dependencies_count}</div>
                                <div className="col-span-2">
                                  <span className="text-red-600 font-medium">
                                    🔥 Fires: {job.summary.fires_detected}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <Button
                              onClick={() => {
                                setActiveTab('board')
                                fetchRAIDEntries()
                              }}
                              className="w-full"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View RAID Board
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* RAID Board Tab */}
        <TabsContent value="board" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>RAID Board</CardTitle>
                  <CardDescription>
                    Manage and monitor all RAID entries with filtering and editing capabilities
                  </CardDescription>
                </div>
                <Button onClick={fetchRAIDEntries} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Risk">Risk</SelectItem>
                    <SelectItem value="Assumption">Assumption</SelectItem>
                    <SelectItem value="Issue">Issue</SelectItem>
                    <SelectItem value="Dependency">Dependency</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severity</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* RAID Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Fire</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRAIDEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          No RAID entries found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRAIDEntries.map((entry) => (
                        <TableRow key={entry.id} className={entry.is_fire ? 'bg-red-50' : ''}>
                          <TableCell>
                            <Badge variant="outline">{entry.type}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{entry.title}</TableCell>
                          <TableCell>{getSeverityBadge(entry.severity)}</TableCell>
                          <TableCell>{entry.owner || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={entry.status === 'Open' ? 'destructive' : 'secondary'}>
                              {entry.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {entry.priority_score}
                          </TableCell>
                          <TableCell>{entry.due_date || '-'}</TableCell>
                          <TableCell>
                            {entry.is_fire && (
                              <Badge variant="destructive" className="bg-red-600">
                                <Flame className="h-3 w-3 mr-1" />
                                Fire
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              <Edit className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fires Tab */}
        <TabsContent value="fires" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Flame className="h-5 w-5 mr-2 text-red-600" />
                Active Fires
              </CardTitle>
              <CardDescription>Critical RAID items requiring immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fireEvents.filter((f) => f.status !== 'Resolved').length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-500">No active fires detected</p>
                  </div>
                ) : (
                  fireEvents
                    .filter((f) => f.status !== 'Resolved')
                    .map((fire) => (
                      <div key={fire.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-red-900">
                              {fire.raid_entry?.title || 'Unknown RAID Item'}
                            </h4>
                            <p className="text-sm text-red-700">
                              Triggered: {new Date(fire.triggered_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getSeverityBadge(fire.severity)}
                            <Badge variant="outline">{fire.status}</Badge>
                          </div>
                        </div>

                        <div className="mb-3">
                          <p className="text-sm text-red-800">
                            <strong>Trigger Rule:</strong> {fire.trigger_rule}
                          </p>
                          <p className="text-sm text-red-800">
                            <strong>Priority Score:</strong> {fire.priority_score}
                          </p>
                        </div>

                        <div className="mb-3">
                          <h5 className="font-medium text-red-900 mb-2">Recommended Actions:</h5>
                          <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                            {fire.next_actions.map((action, index) => (
                              <li key={index}>{action}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleAcknowledgeFire(fire.id)}
                            disabled={fire.status !== 'Unacknowledged'}
                          >
                            {fire.status === 'Unacknowledged' ? 'Acknowledge' : 'Acknowledged'}
                          </Button>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Export RAID Log</CardTitle>
              <CardDescription>
                Download your RAID data for reporting and integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Export Options</h4>
                    <div className="space-y-3">
                      <Button onClick={handleExportRAID} className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Export RAID Log (CSV)
                      </Button>
                      <Button variant="outline" className="w-full" disabled>
                        <Download className="h-4 w-4 mr-2" />
                        Export RAID Log (XLSX) - Coming Soon
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Integration Options</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="project-plan-integration" defaultChecked />
                        <label htmlFor="project-plan-integration" className="text-sm">
                          Include RAID summary in generated project plans
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="fire-alerts" defaultChecked />
                        <label htmlFor="fire-alerts" className="text-sm">
                          Enable fire alerts in dashboard
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">RAID Statistics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-2xl font-bold text-red-600">
                        {raidEntries.filter((e) => e.type === 'Risk').length}
                      </div>
                      <div className="text-gray-600">Risks</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">
                        {raidEntries.filter((e) => e.type === 'Assumption').length}
                      </div>
                      <div className="text-gray-600">Assumptions</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">
                        {raidEntries.filter((e) => e.type === 'Issue').length}
                      </div>
                      <div className="text-gray-600">Issues</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {raidEntries.filter((e) => e.type === 'Dependency').length}
                      </div>
                      <div className="text-gray-600">Dependencies</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Connection Status</CardTitle>
              <CardDescription>
                RAID Monitoring uses the same credentials as Project Plan Builder
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Google Drive</span>
                  <Badge variant={credentials.google_connected ? 'default' : 'destructive'}>
                    {credentials.google_connected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pinecone</span>
                  <Badge variant={credentials.pinecone_configured ? 'default' : 'destructive'}>
                    {credentials.pinecone_configured ? 'Configured' : 'Not Configured'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>OpenAI</span>
                  <Badge variant={credentials.openai_configured ? 'default' : 'secondary'}>
                    {credentials.openai_configured ? 'Configured' : 'Not Configured'}
                  </Badge>
                </div>
              </div>

              <div className="mt-6">
                <Link href="/business-hacks/project-plan-builder?tab=settings">
                  <Button variant="outline" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Credentials
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
