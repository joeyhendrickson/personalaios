'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Brain,
  Target,
  Repeat,
  BookOpen,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import {
  parseLifestacksWorkbook,
  type LifestacksImportPayload,
} from '@/lib/import/lifestacks-import-schema'

interface ExcelImportProps {
  onImportComplete: (data: LifestacksImportPayload) => void
}

export function ExcelImport({ onImportComplete }: ExcelImportProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [importedData, setImportedData] = useState<LifestacksImportPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 100)

      const data = await readWorkbookFile(file)

      clearInterval(progressInterval)
      setUploadProgress(100)

      setTimeout(() => {
        setImportedData(data)
        setIsUploading(false)
      }, 500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process Excel file')
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const readWorkbookFile = (file: File): Promise<LifestacksImportPayload> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: 'binary' })
          const parsed = parseLifestacksWorkbook(workbook)
          const total =
            parsed.goals.length +
            parsed.projects.length +
            parsed.tasks.length +
            parsed.habits.length +
            parsed.education.length
          if (total === 0) {
            reject(
              new Error(
                'No import rows found. Use the LifeStacks master template with sheets: LifeGoals, Projects, Tasks, Habits, Education.'
              )
            )
            return
          }
          resolve(parsed)
        } catch {
          reject(new Error('Failed to parse file. Use the LifeStacks master import template.'))
        }
      }

      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsBinaryString(file)
    })
  }

  const handleAIPrioritization = async () => {
    if (!importedData) return

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/import/prioritize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goals: importedData.projects.map((p) => ({
            title: p.title,
            description: p.description,
            category: p.category,
            targetPoints: p.target_points,
            priority: 'medium',
            deadline: p.deadline || '',
            tasks: [],
          })),
          tasks: importedData.tasks.map((t) => ({
            title: t.title,
            description: t.description,
            points: t.points_value,
            priority: t.priority,
            estimatedTime: t.estimated_time || '1 hour',
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to prioritize tasks with AI')
      }

      const prioritizedData = await response.json()
      setImportedData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          projects: prev.projects.map((p, i) => {
            const updated = prioritizedData.goals?.[i]
            return updated ? { ...p, description: updated.description || p.description } : p
          }),
          tasks: prev.tasks.map((t, i) => {
            const updated = prioritizedData.tasks?.[i]
            return updated
              ? {
                  ...t,
                  priority: updated.priority || t.priority,
                  points_value: updated.points ?? t.points_value,
                }
              : t
          }),
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to prioritize tasks')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImport = () => {
    if (importedData) {
      onImportComplete(importedData)
      setImportedData(null)
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const totalRows = importedData
    ? importedData.goals.length +
      importedData.projects.length +
      importedData.tasks.length +
      importedData.habits.length +
      importedData.education.length
    : 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            LifeStacks Master Import
          </CardTitle>
          <CardDescription>
            Upload the master Excel template (filled in by you or ChatGPT). Supports life goals,
            projects, tasks, habits, and education in one file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
            <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium mb-2">Upload completed template</p>
            <p className="text-sm text-gray-600 mb-4">Supported formats: .xlsx, .xls</p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="mb-4"
            >
              {isUploading ? 'Uploading...' : 'Choose File'}
            </Button>

            {isUploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-gray-600">{uploadProgress}% uploaded</p>
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {importedData && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Ready to import {totalRows} rows across{' '}
                  {[
                    importedData.goals.length && `${importedData.goals.length} goals`,
                    importedData.projects.length && `${importedData.projects.length} projects`,
                    importedData.tasks.length && `${importedData.tasks.length} tasks`,
                    importedData.habits.length && `${importedData.habits.length} habits`,
                    importedData.education.length && `${importedData.education.length} education`,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: 'Life goals', count: importedData.goals.length, icon: Target },
                  { label: 'Projects', count: importedData.projects.length, icon: Target },
                  { label: 'Tasks', count: importedData.tasks.length, icon: CheckCircle },
                  { label: 'Habits', count: importedData.habits.length, icon: Repeat },
                  { label: 'Education', count: importedData.education.length, icon: BookOpen },
                ].map(({ label, count, icon: Icon }) => (
                  <Card key={label}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {label} ({count})
                      </CardTitle>
                    </CardHeader>
                  </Card>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleAIPrioritization}
                  disabled={isProcessing}
                  className="flex items-center gap-2"
                >
                  <Brain className="h-4 w-4" />
                  {isProcessing ? 'AI Processing...' : 'AI Prioritize tasks'}
                </Button>
                <Button
                  onClick={handleImport}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Import to Dashboard
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Template sheets</CardTitle>
          <CardDescription>
            Download{' '}
            <code className="text-xs bg-gray-100 px-1 rounded">
              lifestacks-master-import-template.xlsx
            </code>{' '}
            and the ChatGPT prompt below. Fill every sheet, then upload here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <p>
            <strong>Categories</strong> — valid slugs for project categories (reference only)
          </p>
          <p>
            <strong>LifeGoals</strong> — high-level goals (no points; tracked by completion in
            LifeStacks)
          </p>
          <p>
            <strong>Projects</strong> — weekly dashboard projects with{' '}
            <code className="text-xs">target_points</code>
          </p>
          <p>
            <strong>Tasks</strong> — link each row to a{' '}
            <code className="text-xs">project_title</code> with{' '}
            <code className="text-xs">points_value</code>
          </p>
          <p>
            <strong>Habits</strong> — daily habits with{' '}
            <code className="text-xs">points_per_completion</code>
          </p>
          <p>
            <strong>Education</strong> — courses/certs with{' '}
            <code className="text-xs">points_value</code>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
