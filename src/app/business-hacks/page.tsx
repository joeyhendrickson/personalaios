'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  ArrowLeft,
  Music,
  BookOpen,
  Settings,
  Trash2,
  FileText,
  AlertTriangle,
  PenTool,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface BusinessApp {
  id: string
  name: string
  description: string
  icon: string
  created_at: string
}

export default function BusinessHacksPage() {
  const [businessApps, setBusinessApps] = useState<BusinessApp[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBusinessApps()
  }, [])

  const fetchBusinessApps = async () => {
    try {
      const response = await fetch('/api/business-hacks')
      if (response.ok) {
        const data = await response.json()
        setBusinessApps(data.businessApps || [])
      }
    } catch (error) {
      console.error('Error fetching business apps:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInstallApp = async (appName: string) => {
    try {
      const response = await fetch('/api/business-hacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appName }),
      })

      if (response.ok) {
        await fetchBusinessApps()
      } else {
        const errorData = await response.json()
        console.error('Error installing app:', errorData)
        alert(`Failed to install app: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error installing app:', error)
      alert('Failed to install app. Please try again.')
    }
  }

  const handleDeleteApp = async (appId: string) => {
    if (!confirm('Are you sure you want to delete this business app?')) return

    try {
      const response = await fetch(`/api/business-hacks/${appId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchBusinessApps()
      }
    } catch (error) {
      console.error('Error deleting app:', error)
    }
  }

  const availableApps = [
    {
      name: 'Co-Writer',
      description:
        'AI-powered songwriting assistant for analyzing songs, providing feedback, and helping improve lyrics through iteration.',
      icon: 'Music',
      features: [
        'Upload recorded songs for transcription',
        'Analyze lyrics and provide feedback',
        'AI-generated suggestions for improvements',
        'Iterative songwriting process with version control',
        'Download lyrics as PDF',
      ],
    },
    {
      name: 'Ghost Writer',
      description:
        'AI book writing assistant that helps structure and write books chapter by chapter, from outline to finished manuscript.',
      icon: 'BookOpen',
      features: [
        'Create structured book outlines',
        'Chapter-by-chapter writing assistance',
        'Multiple book types: fiction, non-fiction, white papers',
        'Document upload support for research',
        'Compile complete books into formatted PDFs',
      ],
    },
    {
      name: 'Project Plan Builder',
      description:
        'AI-powered project planning tool that analyzes client documents and generates comprehensive project plans with BYOK integration.',
      icon: 'FileText',
      features: [
        'Google Drive integration for client files',
        'Pinecone vector database for knowledge indexing',
        'AI-powered document analysis and knowledge extraction',
        'Automated project plan generation with citations',
        'Multi-format export (PDF, DOCX)',
      ],
    },
    {
      name: 'RAID Monitoring Tool',
      description:
        'Continuous monitoring tool that analyzes Google Drive documents to build RAID logs and automatically detect critical fires.',
      icon: 'AlertTriangle',
      features: [
        'Automated RAID extraction from meeting notes and docs',
        'Real-time fire detection and alerting',
        'Centralized RAID board with filtering and editing',
        'Continuous sync and auto-resolution',
        'Export to CSV/XLSX and project plan integration',
      ],
    },
    {
      name: 'Post Creator',
      description:
        'AI-powered social media post generator that analyzes your historical posts to create authentic content in your unique voice.',
      icon: 'PenTool',
      features: [
        'Voice analysis from historical Facebook, LinkedIn, Instagram posts',
        'Platform-specific post generation (Facebook, LinkedIn, Instagram, Reddit)',
        'Customizable tone, sentiment, and target audience',
        'Authentic voice matching to avoid AI-generated feel',
        'Content optimization for engagement and reach',
      ],
    },
  ]

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'Music':
        return <Music className="h-8 w-8" />
      case 'BookOpen':
        return <BookOpen className="h-8 w-8" />
      case 'FileText':
        return <FileText className="h-8 w-8" />
      case 'AlertTriangle':
        return <AlertTriangle className="h-8 w-8" />
      case 'PenTool':
        return <PenTool className="h-8 w-8" />
      default:
        return <Settings className="h-8 w-8" />
    }
  }

  const getAppPath = (appName: string) => {
    switch (appName) {
      case 'Co-Writer':
        return '/business-hacks/co-writer'
      case 'Ghost Writer':
        return '/business-hacks/ghost-writer'
      case 'Project Plan Builder':
        return '/business-hacks/project-plan-builder'
      case 'RAID Monitoring Tool':
        return '/business-hacks/raid-monitoring'
      case 'Post Creator':
        return '/business-hacks/post-creator'
      default:
        return '/business-hacks'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Business Hacks</h1>
              <p className="text-gray-600">
                Productivity and creativity tools for business and content creation
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Installed Apps */}
      {businessApps.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Installed Apps</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {businessApps.map((app) => (
              <Card key={app.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">{getIconComponent(app.icon)}</div>
                      <div>
                        <CardTitle className="text-lg">{app.name}</CardTitle>
                        <CardDescription>{app.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => window.open(getAppPath(app.name), '_blank')}
                      >
                        Open
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteApp(app.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Available Apps */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Available Apps</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {availableApps.map((app) => {
            const isInstalled = businessApps.some((installed) => installed.name === app.name)
            return (
              <Card key={app.name} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">{getIconComponent(app.icon)}</div>
                    <div>
                      <CardTitle className="text-lg">{app.name}</CardTitle>
                      <CardDescription>{app.description}</CardDescription>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700">Features:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {app.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleInstallApp(app.name)}
                    disabled={isInstalled}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {isInstalled ? 'Already Installed' : 'Install App'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
