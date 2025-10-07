'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ExcelImport } from '@/components/import/excel-import'
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

interface ImportedGoal {
  title: string
  description: string
  category: string
  targetPoints: number
  priority: 'low' | 'medium' | 'high'
  deadline: string
  tasks: ImportedTask[]
  aiRecommendations?: string
}

interface ImportedTask {
  title: string
  description: string
  points: number
  priority: 'low' | 'medium' | 'high'
  estimatedTime: string
  aiRecommendations?: string
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

  const handleImportComplete = async (goals: ImportedGoal[], tasks: ImportedTask[]) => {
    setIsImporting(true)
    setImportStatus('Importing goals and tasks...')

    try {
      const requestData = {
        goals: goals.map((goal) => ({
          title: goal.title,
          description: goal.description,
          category: goal.category,
          target_points: goal.targetPoints,
          target_money: 0,
          priority: goal.priority,
          deadline: goal.deadline,
        })),
        tasks: tasks.map((task) => ({
          title: task.title,
          description: task.description,
          points_value: task.points,
          money_value: 0,
          priority: task.priority,
          estimated_time: task.estimatedTime,
        })),
      }

      console.log('Sending import data:', requestData)

      // Use the new import endpoint that handles authentication and database operations
      const response = await fetch('/api/import/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Import error:', errorData)

        // Show more detailed error information
        let errorMessage = errorData.error || 'Failed to import goals and tasks'
        if (errorData.details) {
          errorMessage += `: ${JSON.stringify(errorData.details)}`
        }

        throw new Error(errorMessage)
      }

      const result = await response.json()
      setImportStatus(result.message || 'Import completed successfully!')

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
                    Life goals with points, money targets, priorities, and deadlines
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
                    Project tracking with progress, status, and deadlines
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
                    Actionable tasks with points, priorities, and time estimates
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
                    Daily habits with points, streaks, and tracking
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
                    Custom dashboard categories with colors and icons
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
                    <h4 className="font-medium text-gray-900">Download Templates</h4>
                    <p className="text-sm text-gray-600">
                      Download the CSV templates above that match the data you want to import.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-medium">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Fill in Your Data</h4>
                    <p className="text-sm text-gray-600">
                      Replace the sample data with your actual goals, tasks, habits, and other
                      information. Keep the column headers exactly as they are.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-medium">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Upload and Import</h4>
                    <p className="text-sm text-gray-600">
                      Use the upload area above to select your CSV files. Our AI will analyze and
                      prioritize your data automatically.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-medium">4</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Review and Confirm</h4>
                    <p className="text-sm text-gray-600">
                      Review the AI recommendations and confirm the import. Your data will be
                      organized in your personalized dashboard.
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
