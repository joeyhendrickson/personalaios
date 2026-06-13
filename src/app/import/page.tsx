'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ExcelImport } from '@/components/import/excel-import'
import type { LifestacksImportPayload } from '@/lib/import/lifestacks-import-schema'
import {
  ArrowLeft,
  CheckCircle,
  Brain,
  Target,
  Clock,
  User,
  Download,
  FileSpreadsheet,
  BookOpen,
  Repeat,
  Settings,
  FolderOpen,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

async function downloadPublicFile(path: string, filename: string) {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`Failed to fetch ${path}`)
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export default function ImportPage() {
  const router = useRouter()
  const [isImporting, setIsImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [user, setUser] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user as any)
      setLoading(false)

      if (!user) {
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])

  const handleImportComplete = async (data: LifestacksImportPayload) => {
    setIsImporting(true)
    setImportStatus('Importing dashboard data...')

    try {
      const response = await fetch('/api/import/dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Import error:', errorData)

        let errorMessage = errorData.error || 'Failed to import dashboard data'
        if (errorData.details) {
          errorMessage += `: ${JSON.stringify(errorData.details)}`
        }

        throw new Error(errorMessage)
      }

      const result = await response.json()
      const skipped =
        result.imported?.skippedTasks?.length > 0
          ? ` (${result.imported.skippedTasks.length} tasks skipped — missing project_title match)`
          : ''
      setImportStatus((result.message || 'Import completed successfully!') + skipped)

      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (error) {
      console.error('Import error:', error)
      setImportStatus(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to import your goals and tasks.</p>
          <Button onClick={() => router.push('/login')}>Go to Login</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Import Dashboard Data</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Upload your Excel spreadsheets and import all your dashboard data including goals,
              projects, tasks, habits, education, and custom categories
            </p>
          </div>
        </div>

        {/* Import Status */}
        {importStatus && (
          <Alert
            className={`mb-6 ${importStatus.includes('successfully') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
          >
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{importStatus}</AlertDescription>
          </Alert>
        )}

        {/* Master template + ChatGPT workflow */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                ChatGPT workflow (recommended)
              </CardTitle>
              <CardDescription>
                Download the master template and prompt, fill the template in ChatGPT with your
                context, then upload the completed file below.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="default"
                className="flex-1"
                onClick={() =>
                  downloadPublicFile(
                    '/lifestacks-master-import-template.xlsx',
                    'lifestacks-master-import-template.xlsx'
                  ).catch(() => alert('Template not found. Run npm run generate:import-template'))
                }
              >
                <Download className="h-4 w-4 mr-2" />
                Master Excel template
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() =>
                  downloadPublicFile(
                    '/chatgpt-lifestacks-import-prompt.md',
                    'chatgpt-lifestacks-import-prompt.md'
                  ).catch(() => alert('Prompt file not found.'))
                }
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                ChatGPT prompt
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Import Component */}
        <div className="max-w-4xl mx-auto">
          <ExcelImport onImportComplete={handleImportComplete} />
        </div>

        {/* Features Overview */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-lg">Smart Goal Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                AI analyzes your goals based on strategic importance, deadlines, and potential
                impact to optimize your focus.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-lg">AI Prioritization</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Advanced AI algorithms prioritize your tasks based on effort vs. impact,
                dependencies, and time sensitivity.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle className="text-lg">Time Optimization</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Get intelligent recommendations for task sequencing and time allocation to maximize
                your productivity.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Download Templates */}
        <div className="mt-12 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Download className="h-5 w-5 mr-2" />
                Download CSV Templates
              </CardTitle>
              <CardDescription>
                Download our comprehensive CSV templates to get started with the correct format.
                Each template includes sample data and proper column headers for easy import.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button
                  onClick={async () => {
                    try {
                      const response = await fetch('/goals-template.csv')
                      const blob = await response.blob()
                      const url = window.URL.createObjectURL(blob)
                      const link = document.createElement('a')
                      link.href = url
                      link.download = 'goals-template.csv'
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                      window.URL.revokeObjectURL(url)
                    } catch (error) {
                      console.error('Failed to download goals template:', error)
                      alert('Failed to download goals template. Please try again.')
                    }
                  }}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start"
                >
                  <div className="flex items-center mb-2">
                    <Target className="h-4 w-4 mr-2 text-blue-600" />
                    <span className="font-medium">Goals Template</span>
                  </div>
                  <span className="text-sm text-gray-600 text-left">
                    High-level life goals (no points — completion toggle in app)
                  </span>
                </Button>

                <Button
                  onClick={async () => {
                    try {
                      const response = await fetch('/projects-template.csv')
                      const blob = await response.blob()
                      const url = window.URL.createObjectURL(blob)
                      const link = document.createElement('a')
                      link.href = url
                      link.download = 'projects-template.csv'
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                      window.URL.revokeObjectURL(url)
                    } catch (error) {
                      console.error('Failed to download projects template:', error)
                      alert('Failed to download projects template. Please try again.')
                    }
                  }}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start"
                >
                  <div className="flex items-center mb-2">
                    <FolderOpen className="h-4 w-4 mr-2 text-purple-600" />
                    <span className="font-medium">Projects Template</span>
                  </div>
                  <span className="text-sm text-gray-600 text-left">
                    Weekly projects with target_points and optional linked goal
                  </span>
                </Button>

                <Button
                  onClick={async () => {
                    try {
                      const response = await fetch('/tasks-template.csv')
                      const blob = await response.blob()
                      const url = window.URL.createObjectURL(blob)
                      const link = document.createElement('a')
                      link.href = url
                      link.download = 'tasks-template.csv'
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                      window.URL.revokeObjectURL(url)
                    } catch (error) {
                      console.error('Failed to download tasks template:', error)
                      alert('Failed to download tasks template. Please try again.')
                    }
                  }}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start"
                >
                  <div className="flex items-center mb-2">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                    <span className="font-medium">Tasks Template</span>
                  </div>
                  <span className="text-sm text-gray-600 text-left">
                    Tasks linked to project_title with points_value
                  </span>
                </Button>

                <Button
                  onClick={async () => {
                    try {
                      const response = await fetch('/habits-template.csv')
                      const blob = await response.blob()
                      const url = window.URL.createObjectURL(blob)
                      const link = document.createElement('a')
                      link.href = url
                      link.download = 'habits-template.csv'
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                      window.URL.revokeObjectURL(url)
                    } catch (error) {
                      console.error('Failed to download habits template:', error)
                      alert('Failed to download habits template. Please try again.')
                    }
                  }}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start"
                >
                  <div className="flex items-center mb-2">
                    <Repeat className="h-4 w-4 mr-2 text-cyan-600" />
                    <span className="font-medium">Habits Template</span>
                  </div>
                  <span className="text-sm text-gray-600 text-left">
                    Daily habits with points_per_completion
                  </span>
                </Button>

                <Button
                  onClick={async () => {
                    try {
                      const response = await fetch('/education-template.csv')
                      const blob = await response.blob()
                      const url = window.URL.createObjectURL(blob)
                      const link = document.createElement('a')
                      link.href = url
                      link.download = 'education-template.csv'
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                      window.URL.revokeObjectURL(url)
                    } catch (error) {
                      console.error('Failed to download education template:', error)
                      alert('Failed to download education template. Please try again.')
                    }
                  }}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start"
                >
                  <div className="flex items-center mb-2">
                    <BookOpen className="h-4 w-4 mr-2 text-red-600" />
                    <span className="font-medium">Education Template</span>
                  </div>
                  <span className="text-sm text-gray-600 text-left">
                    Learning goals with progress tracking and completion dates
                  </span>
                </Button>

                <Button
                  onClick={async () => {
                    try {
                      const response = await fetch('/categories-template.csv')
                      const blob = await response.blob()
                      const url = window.URL.createObjectURL(blob)
                      const link = document.createElement('a')
                      link.href = url
                      link.download = 'categories-template.csv'
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                      window.URL.revokeObjectURL(url)
                    } catch (error) {
                      console.error('Failed to download categories template:', error)
                      alert('Failed to download categories template. Please try again.')
                    }
                  }}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start"
                >
                  <div className="flex items-center mb-2">
                    <Settings className="h-4 w-4 mr-2 text-purple-600" />
                    <span className="font-medium">Categories Template</span>
                  </div>
                  <span className="text-sm text-gray-600 text-left">
                    Valid category slugs for the Projects sheet
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Import Instructions */}
        <div className="mt-8 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Import Instructions</CardTitle>
              <CardDescription>
                Follow these steps to successfully import your data into Life Stacks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-medium">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Download template & prompt</h4>
                    <p className="text-sm text-gray-600">
                      Get the master Excel template and ChatGPT instructions above.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-medium">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Fill with ChatGPT (or manually)</h4>
                    <p className="text-sm text-gray-600">
                      Upload the template to ChatGPT, add your notes/files, and ask it to complete
                      every sheet. Goals have no points; projects, tasks, habits, and education
                      include point values.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-medium">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Upload and import</h4>
                    <p className="text-sm text-gray-600">
                      Upload the completed Excel file. Optionally run AI prioritize, then import to
                      your dashboard.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-medium">4</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Review on dashboard</h4>
                    <p className="text-sm text-gray-600">
                      Confirm goals, projects, tasks, habits, and education appear in the right
                      sections.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
