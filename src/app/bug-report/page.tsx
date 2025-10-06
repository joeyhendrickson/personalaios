'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Upload, Bug, Lightbulb, Send } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

export default function BugReportPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [screenshotUrl, setScreenshotUrl] = useState('')

  const [formData, setFormData] = useState({
    type: 'bug' as 'bug' | 'feature',
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleScreenshotUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      setError('Screenshot must be smaller than 5MB')
      return
    }

    setScreenshotFile(file)

    // In a real implementation, you would upload to a storage service like Supabase Storage
    // For now, we'll create a placeholder URL
    setScreenshotUrl(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // TODO: Upload screenshot to storage service if file exists
      let finalScreenshotUrl = screenshotUrl
      if (screenshotFile) {
        // This would be implemented with actual file upload
        finalScreenshotUrl = 'placeholder-upload-url'
      }

      const response = await fetch('/api/bug-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          screenshot_url: finalScreenshotUrl || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit report')
      }

      setSuccess(true)
      setFormData({
        type: 'bug',
        title: '',
        description: '',
        priority: 'medium',
      })
      setScreenshotFile(null)
      setScreenshotUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Send className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl text-green-800">
                  Report Submitted Successfully!
                </CardTitle>
                <CardDescription>
                  Thank you for helping improve Life Stacks. We'll review your{' '}
                  {formData.type === 'bug' ? 'bug report' : 'feature request'} and get back to you
                  soon.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button onClick={() => router.push('/dashboard')} className="mr-4">
                  Back to Dashboard
                </Button>
                <Button variant="outline" onClick={() => setSuccess(false)}>
                  Submit Another Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Report Bug or Suggest Feature
              </h1>
              <p className="text-xl text-gray-600">
                Help us improve Life Stacks by reporting issues or sharing your ideas
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {formData.type === 'bug' ? (
                  <Bug className="h-5 w-5 mr-2 text-red-500" />
                ) : (
                  <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
                )}
                {formData.type === 'bug' ? 'Bug Report' : 'Feature Request'}
              </CardTitle>
              <CardDescription>
                {formData.type === 'bug'
                  ? 'Describe the issue you encountered and help us fix it'
                  : 'Share your idea for a new feature that would improve Life Stacks'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Report Type */}
                <div className="space-y-2">
                  <Label htmlFor="type">Report Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: 'bug' | 'feature') => handleInputChange('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bug">
                        <div className="flex items-center">
                          <Bug className="h-4 w-4 mr-2 text-red-500" />
                          Bug Report
                        </div>
                      </SelectItem>
                      <SelectItem value="feature">
                        <div className="flex items-center">
                          <Lightbulb className="h-4 w-4 mr-2 text-yellow-500" />
                          Feature Request
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority (only for bugs) */}
                {formData.type === 'bug' && (
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') =>
                        handleInputChange('priority', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low - Minor issue</SelectItem>
                        <SelectItem value="medium">Medium - Moderate issue</SelectItem>
                        <SelectItem value="high">High - Significant issue</SelectItem>
                        <SelectItem value="critical">Critical - Blocks functionality</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder={
                      formData.type === 'bug'
                        ? 'Brief description of the bug'
                        : 'What feature would you like to see?'
                    }
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder={
                      formData.type === 'bug'
                        ? 'Please describe what happened, what you expected to happen, and steps to reproduce the issue...'
                        : 'Describe your feature idea in detail. How would it work? What problem would it solve?'
                    }
                    rows={6}
                    required
                  />
                </div>

                {/* Screenshot Upload */}
                <div className="space-y-2">
                  <Label htmlFor="screenshot">Screenshot (Optional)</Label>
                  <div className="flex items-center space-x-4">
                    <Input
                      id="screenshot"
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                      className="flex-1"
                    />
                    <Upload className="h-4 w-4 text-gray-400" />
                  </div>
                  {screenshotFile && (
                    <div className="mt-2">
                      <img
                        src={screenshotUrl}
                        alt="Screenshot preview"
                        className="max-w-xs rounded border"
                      />
                    </div>
                  )}
                  <p className="text-sm text-gray-500">
                    Upload a screenshot to help us understand the issue better (max 5MB)
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit {formData.type === 'bug' ? 'Bug Report' : 'Feature Request'}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
