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
  FileText,
  FolderOpen,
  Key,
  Brain,
  RefreshCw,
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

interface UserCredentials {
  google_connected: boolean
  pinecone_configured: boolean
  openai_configured: boolean
}

interface AnalysisJob {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  client_name: string
  project_name: string
  sufficiency_report?: SufficiencyReport
  created_at: string
}

interface SufficiencyReport {
  coverage_percentages: {
    requirements: number
    constraints: number
    decisions: number
    risks: number
    terms: number
    personas: number
  }
  missing_items: string[]
  conflicts: string[]
  warnings: Warning[]
}

interface Warning {
  type: 'critical' | 'recommended'
  message: string
  category: string
}

interface GeneratedPlan {
  id: string
  title: string
  status: 'draft' | 'completed'
  created_at: string
  download_url?: string
}

export default function ProjectPlanBuilderPage() {
  const [activeTab, setActiveTab] = useState('settings')
  const [credentials, setCredentials] = useState<UserCredentials>({
    google_connected: false,
    pinecone_configured: false,
    openai_configured: false,
  })
  const [analysisJobs, setAnalysisJobs] = useState<AnalysisJob[]>([])
  const [generatedPlans, setGeneratedPlans] = useState<GeneratedPlan[]>([])
  const [loading, setLoading] = useState(false)

  // Form states
  const [pineconeKey, setPineconeKey] = useState('')
  const [pineconeProject, setPineconeProject] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [driveFolderUrl, setDriveFolderUrl] = useState('')
  const [clientName, setClientName] = useState('')
  const [projectName, setProjectName] = useState('')

  useEffect(() => {
    fetchCredentials()
    fetchAnalysisJobs()
    fetchGeneratedPlans()
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
      const response = await fetch('/api/project-plan-builder/jobs')
      if (response.ok) {
        const data = await response.json()
        setAnalysisJobs(data.jobs || [])
      }
    } catch (error) {
      console.error('Error fetching analysis jobs:', error)
    }
  }

  const fetchGeneratedPlans = async () => {
    try {
      const response = await fetch('/api/project-plan-builder/plans')
      if (response.ok) {
        const data = await response.json()
        setGeneratedPlans(data.plans || [])
      }
    } catch (error) {
      console.error('Error fetching generated plans:', error)
    }
  }

  const handleConnectGoogle = async () => {
    try {
      const response = await fetch('/api/project-plan-builder/auth/google')
      if (response.ok) {
        const data = await response.json()
        window.location.href = data.auth_url
      }
    } catch (error) {
      console.error('Error connecting to Google:', error)
    }
  }

  const handleSaveCredentials = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/project-plan-builder/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pinecone_key: pineconeKey,
          pinecone_project: pineconeProject,
          openai_key: openaiKey,
        }),
      })

      if (response.ok) {
        await fetchCredentials()
        setPineconeKey('')
        setPineconeProject('')
        setOpenaiKey('')
      }
    } catch (error) {
      console.error('Error saving credentials:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartAnalysis = async () => {
    if (!driveFolderUrl || !clientName || !projectName) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/project-plan-builder/analyze', {
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
        setActiveTab('analyze')
      }
    } catch (error) {
      console.error('Error starting analysis:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePlan = async (jobId: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/project-plan-builder/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId }),
      })

      if (response.ok) {
        await fetchGeneratedPlans()
        setActiveTab('plans')
      }
    } catch (error) {
      console.error('Error generating plan:', error)
    } finally {
      setLoading(false)
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

  const getWarningIcon = (type: string) => {
    return type === 'critical' ? (
      <AlertTriangle className="h-4 w-4 text-red-500" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-yellow-500" />
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
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
                <FileText className="h-8 w-8 mr-3 text-blue-600" />
                Project Plan Builder
              </h1>
              <p className="text-gray-600">
                AI-powered project planning with Google Drive and Pinecone integration
              </p>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="analyze">Analyze</TabsTrigger>
          <TabsTrigger value="plans">Generated Plans</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Google Drive Connection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FolderOpen className="h-5 w-5 mr-2" />
                  Google Drive Integration
                </CardTitle>
                <CardDescription>
                  Connect your Google Drive to access client files and documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {credentials.google_connected ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="font-medium">
                      {credentials.google_connected ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>
                  <Button
                    onClick={handleConnectGoogle}
                    disabled={credentials.google_connected}
                    variant={credentials.google_connected ? 'outline' : 'default'}
                  >
                    {credentials.google_connected ? 'Reconnect' : 'Connect Google Drive'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Pinecone Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="h-5 w-5 mr-2" />
                  Pinecone Configuration
                </CardTitle>
                <CardDescription>
                  Configure your Pinecone API key and project for vector storage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {credentials.pinecone_configured ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="font-medium">
                        {credentials.pinecone_configured ? 'Configured' : 'Not Configured'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="pinecone-key">Pinecone API Key</Label>
                      <Input
                        id="pinecone-key"
                        type="password"
                        placeholder="Enter your Pinecone API key"
                        value={pineconeKey}
                        onChange={(e) => setPineconeKey(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="pinecone-project">Project ID</Label>
                      <Input
                        id="pinecone-project"
                        placeholder="Enter your Pinecone project ID"
                        value={pineconeProject}
                        onChange={(e) => setPineconeProject(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleSaveCredentials}
                      disabled={loading || !pineconeKey || !pineconeProject}
                    >
                      Save Configuration
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* OpenAI Configuration (Optional) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="h-5 w-5 mr-2" />
                  OpenAI Configuration (Optional)
                </CardTitle>
                <CardDescription>
                  Add your OpenAI API key for enhanced AI capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {credentials.openai_configured ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      )}
                      <span className="font-medium">
                        {credentials.openai_configured ? 'Configured' : 'Not Configured'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="openai-key">OpenAI API Key</Label>
                      <Input
                        id="openai-key"
                        type="password"
                        placeholder="Enter your OpenAI API key (optional)"
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleSaveCredentials}
                      disabled={loading || !openaiKey}
                      variant="outline"
                    >
                      Save Configuration
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Connection Status */}
            <Card>
              <CardHeader>
                <CardTitle>Connection Status</CardTitle>
                <CardDescription>Overview of all connected services</CardDescription>
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analyze Tab */}
        <TabsContent value="analyze" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Start New Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Start New Analysis</CardTitle>
                <CardDescription>
                  Analyze a Google Drive folder to extract project knowledge
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
                    Start Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Analysis Jobs */}
            <Card>
              <CardHeader>
                <CardTitle>Analysis Jobs</CardTitle>
                <CardDescription>Track the progress of your document analysis</CardDescription>
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

                        {job.status === 'completed' && job.sufficiency_report && (
                          <div className="space-y-3">
                            <div>
                              <h5 className="font-medium mb-2">Sufficiency Report</h5>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  Requirements:{' '}
                                  {job.sufficiency_report.coverage_percentages.requirements}%
                                </div>
                                <div>
                                  Constraints:{' '}
                                  {job.sufficiency_report.coverage_percentages.constraints}%
                                </div>
                                <div>
                                  Decisions: {job.sufficiency_report.coverage_percentages.decisions}
                                  %
                                </div>
                                <div>
                                  Risks: {job.sufficiency_report.coverage_percentages.risks}%
                                </div>
                              </div>
                            </div>

                            {job.sufficiency_report.warnings.length > 0 && (
                              <div>
                                <h5 className="font-medium mb-2">Warnings</h5>
                                <div className="space-y-2">
                                  {job.sufficiency_report.warnings.map((warning, index) => (
                                    <Alert
                                      key={index}
                                      variant={
                                        warning.type === 'critical' ? 'destructive' : 'default'
                                      }
                                    >
                                      <div className="flex items-center space-x-2">
                                        {getWarningIcon(warning.type)}
                                        <AlertDescription className="text-sm">
                                          {warning.message}
                                        </AlertDescription>
                                      </div>
                                    </Alert>
                                  ))}
                                </div>
                              </div>
                            )}

                            <Button
                              onClick={() => handleGeneratePlan(job.id)}
                              disabled={loading}
                              className="w-full"
                            >
                              <Brain className="h-4 w-4 mr-2" />
                              Generate Project Plan
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

        {/* Generated Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generated Project Plans</CardTitle>
              <CardDescription>Download and manage your AI-generated project plans</CardDescription>
            </CardHeader>
            <CardContent>
              {generatedPlans.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No generated plans yet</p>
              ) : (
                <div className="space-y-4">
                  {generatedPlans.map((plan) => (
                    <div key={plan.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{plan.title}</h4>
                          <p className="text-sm text-gray-500">
                            Created {new Date(plan.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={plan.status === 'completed' ? 'default' : 'secondary'}>
                            {plan.status}
                          </Badge>
                          {plan.download_url && (
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Plans</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{generatedPlans.length}</div>
                <p className="text-sm text-gray-500">Generated project plans</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {analysisJobs.filter((job) => job.status === 'running').length}
                </div>
                <p className="text-sm text-gray-500">Currently analyzing</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Completed Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {analysisJobs.filter((job) => job.status === 'completed').length}
                </div>
                <p className="text-sm text-gray-500">Successfully analyzed</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
